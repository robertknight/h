# -*- coding: utf-8 -*-

"""
Code responsible for rendering domain objects into various output
formats.
"""

from __future__ import unicode_literals

from h.presenters.annotation_html import AnnotationHTMLPresenter
from h.presenters.annotation_json import AnnotationJSONPresenter
from h.presenters.annotation_jsonld import AnnotationJSONLDPresenter
from h.presenters.document_html import DocumentHTMLPresenter
from h.presenters.document_json import DocumentJSONPresenter
from h.presenters.group_json import GroupJSONPresenter
from h.presenters.group_json import GroupsJSONPresenter
from h.presenters.user_json import UserJSONPresenter

__all__ = (
    "AnnotationHTMLPresenter",
    "AnnotationJSONPresenter",
    "AnnotationJSONLDPresenter",
    "DocumentHTMLPresenter",
    "DocumentJSONPresenter",
    "GroupJSONPresenter",
    "GroupsJSONPresenter",
    "UserJSONPresenter",
)
