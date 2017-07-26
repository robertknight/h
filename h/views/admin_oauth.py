# -*- coding: utf-8 -*-

from pyramid.httpexceptions import HTTPFound
from pyramid.view import view_config, view_defaults

from h import auth
from h import form
from h import i18n
from h.models import AuthClient
from h.oauth.schemas import CreateAuthClientSchema, EditAuthClientSchema

_ = i18n.TranslationString


@view_config(route_name='admin_oauth',
             renderer='h:templates/admin/oauth.html.jinja2',
             permission='admin_oauth')
def index(request):
    clients = request.db.query(AuthClient) \
                        .order_by(AuthClient.name.asc()) \
                        .all()
    return {'clients': clients}


@view_defaults(route_name='admin_oauth_create',
               permission='admin_oauth',
               renderer='h:templates/admin/oauth_create.html.jinja2')
class AuthClientCreateController(object):

    def __init__(self, request):
        self.request = request
        self.schema = CreateAuthClientSchema().bind(request=request)
        self.form = request.create_form(self.schema,
                                        buttons=(_('Register client'),))

    @view_config(request_method='GET')
    def get(self):
        return self._template_context()

    @view_config(request_method='POST')
    def post(self):
        def on_success(appstruct):
            client = AuthClient(name=appstruct['name'],
                                authority=auth.authority(self.request),
                                trusted=appstruct['trusted'],
                                redirect_uri=appstruct['redirect_url'])

            self.request.db.add(client)
            self.request.db.flush()

            read_url = self.request.route_url('admin_oauth_edit', id=client.id)
            return HTTPFound(location=read_url)

        return form.handle_form_submission(self.request, self.form,
                                           on_success=on_success,
                                           on_failure=self._template_context)

    def _template_context(self):
        return {'form': self.form.render()}


@view_defaults(route_name='admin_oauth_edit',
               # FIXME - This breaks the view event for users
               #         who do have this permission.
               # permission='admin_oauth',
               renderer='h:templates/admin/oauth_edit.html.jinja2')
class AuthClientEditController(object):

    def __init__(self, client, request):
        self.request = request
        self.client = client
        self.schema = EditAuthClientSchema().bind(request=request)
        self.form = request.create_form(self.schema,
                                        buttons=(_('Save'),))

    @view_config(request_method='GET')
    def read(self):
        client = self.client
        self.form.set_appstruct({
            'client_id': client.id,
            'client_secret': client.secret or '',
            'name': client.name,
            'trusted': client.trusted,
            'redirect_url': client.redirect_uri or '',
        })
        return self._template_context()

    @view_config(request_method='POST')
    def update(self):
        client = self.client

        def on_success(appstruct):
            client.name = appstruct['name']
            client.trusted = appstruct['trusted']
            client.redirect_uri = appstruct['redirect_url']
            return self._template_context()

        return form.handle_form_submission(self.request, self.form,
                                           on_success=on_success,
                                           on_failure=self._template_context)

    def _template_context(self):
        return {'form': self.form.render()}

    @view_config(request_method='POST',
                 request_param='delete')
    def delete(self):
        self.request.db.delete(self.client)
        return HTTPFound(location=self.request.route_url('admin_oauth'))
