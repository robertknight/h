# -*- coding: utf-8 -*-

import colander

from h import i18n
from h.schemas.base import CSRFSchema

_ = i18n.TranslationString


class CreateAuthClientSchema(CSRFSchema):
    name = colander.SchemaNode(
             colander.String(),
             title=('Name'))

    trusted = colander.SchemaNode(
                colander.Boolean(),
                missing=False,
                title=('Trusted'))

    redirect_url = colander.SchemaNode(
                     colander.String(),
                     missing=None,
                     hint=_('The browser will redirect to this URL after '
                            'authorization'),
                     title=_('Redirect URL'))


class EditAuthClientSchema(CreateAuthClientSchema):
    # FIXME - Make these fields read-only.
    client_id = colander.SchemaNode(
                  colander.String(),
                  title=_('Client ID'))

    client_secret = colander.SchemaNode(
                      colander.String(),
                      title=_('Client Secret'))
