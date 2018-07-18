# -*- coding: utf-8 -*-

from __future__ import unicode_literals
import logging

from celery.result import ResultSet
from sqlalchemy.orm import load_only

from h.models import Annotation
from h.search.config import (
    configure_index,
    delete_index,
    get_aliased_index,
    update_aliased_index,
)
from h.search.index import BatchIndexer
from h.tasks.indexer import reindex_annotations

log = logging.getLogger(__name__)


def reindex(session, es, request, parallel=False):
    """Reindex all annotations into a new index, and update the alias."""

    current_index = get_aliased_index(es)
    if current_index is None:
        raise RuntimeError('cannot reindex if current index is not aliased')

    settings = request.find_service(name='settings')

    # Preload userids of shadowbanned users.
    nipsa_svc = request.find_service(name='nipsa')
    nipsa_svc.fetch_all_flagged_userids()

    new_index = configure_index(es)
    log.info('configured new index {}'.format(new_index))
    setting_name = 'reindex.new_es6_index'
    if es.version < (2,):
        setting_name = 'reindex.new_index'

    try:
        settings.put(setting_name, new_index)
        request.tm.commit()

        if parallel:
            log.info('reindexing annotations into new index {}'.format(new_index))
            _parallel_reindex(request.db, batch_size=500, max_active_tasks=10, timeout=30)
        else:
            log.info('reindexing annotations into new index {}'.format(new_index))
            indexer = BatchIndexer(session, es, request, target_index=new_index, op_type='create')

            errored = indexer.index()
            if errored:
                log.debug('failed to index {} annotations, retrying...'.format(
                    len(errored)))
                errored = indexer.index(errored)
                if errored:
                    log.warn('failed to index {} annotations: {!r}'.format(
                        len(errored),
                        errored))

        log.info('making new index {} current'.format(new_index))
        update_aliased_index(es, new_index)

        log.info('removing previous index {}'.format(current_index))
        delete_index(es, current_index)

    finally:
        settings.delete(setting_name)
        request.tm.commit()


def _parallel_reindex(session, batch_size, max_active_tasks, timeout=None):
    """
    Use Celery to reindex batches of annotations in parallel.

    :param batch_size: Number of annotations to index per Celery task.
    :param max_active_tasks: Maximum number of tasks to create before waiting for active tasks to
                             complete.
    :param timeout: Max delay in seconds to wait for a batch of tasks to finish.
    """

    rs = ResultSet([])
    for batch_ids in _annotation_ids_batched_by_date(session, batch_size):
        rs.add(reindex_annotations.delay(batch_ids))
        if len(rs.results) >= max_active_tasks:
            log.info('waiting for {} reindexing tasks to complete'.format(max_active_tasks))
            rs.join(timeout=timeout)
            rs = ResultSet([])
    log.info('waiting for final {} reindexing tasks to complete'.format(len(rs.results)))
    rs.join(timeout=timeout)


def _annotation_ids_batched_by_date(session, batch_size=100):
    """Yield batches of annotation IDs to reindex."""

    anns = (session.query(Annotation)
                   .filter_by(deleted=False)
                   .order_by(Annotation.updated)
                   .options(load_only("id")))

    batch = []
    for ann in anns:
        batch.append(ann.id)
        if len(batch) == batch_size:
            yield batch
            batch = []
    if batch:
        yield batch
