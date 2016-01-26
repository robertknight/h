# -*- coding: utf-8 -*-
import os

from webassets.filter import ExternalTool, register_filter
import pyramid

from h._compat import string_types


def _locate_npm_bin(name):
    return './node_modules/.bin/{}'.format(name)


# The release versions of webassets upstream don't support extra arguments yet.
class CleanCSS(ExternalTool):
    """
    Minify CSS using `Clean-css <https://github.com/GoalSmashers/clean-css/>`_.
    """

    name = 'cleancss'
    options = {
        'binary': _locate_npm_bin('cleancss'),
        'extra_args': '--skip-advanced --skip-rebase',
    }

    def run(self, _in, out, extra_args):
        args = [_locate_npm_bin('cleancss')] + extra_args
        self.subprocess(args, out, _in)

    def output(self, _in, out, **kw):
        self.run(_in, out, [])

    def input(self, _in, out, **kw):
        extra_args = ['--root', os.path.dirname(kw['source_path'])]
        self.run(_in, out, extra_args)

register_filter(CleanCSS)


class PostCSS(ExternalTool):
    """ Add vendor prefixes using postcss and autoprefixer.

        webassets does ship with an 'autoprefixer' filter but
        it does not support the current version of autoprefixer
        which ships as a postcss plugin rather than standalone
        tool.

        Using postcss directly from JS will also enable transitioning
        to a single JS-based tool for all CSS processing.
    """

    name = 'postcss'
    max_debug_level = None

    def output(self, _in, out, **kw):
        args = ['node', 'scripts/postcss-filter.js']
        self.subprocess(args, out, _in)

register_filter(PostCSS)


class AssetRequest(object):
    """A subscriber predicate that checks whether a route is a static asset.

    This predicate relies on the facto that static assets registered via
    :meth:`pyramid.config.Configurator.add_static_view` are prefixed with
    a double underscore. While this approach seems brittle, it works (provided
    users don't register their own views this way) and it supports all static
    view requests (not just those registered by pyramid_webassets).
    """

    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'asset_request = %s' % (self.val,)

    phash = text

    def __call__(self, event):
        request = event.request
        if request.matched_route is None:
            val = False
        else:
            val = request.matched_route.name.startswith('__')

        return self.val == val


def asset_response_subscriber(event):
    event.response.headers['Access-Control-Allow-Origin'] = '*'


def includeme(config):
    config.registry.settings.setdefault('webassets.bundles', 'h:assets.yaml')
    config.include('pyramid_webassets')

    # Set up a predicate and subscriber to set CORS headers on asset responses
    config.add_subscriber_predicate('asset_request', AssetRequest)
    config.add_subscriber(
        asset_response_subscriber,
        pyramid.events.NewResponse,
        asset_request=True
    )
