'use strict';

import * as queryString from 'query-string';
import {h} from 'preact';

import directive from './directive';

function mailtoLink(address, fields) {
  const fieldString = queryString.stringify(fields);
  return `mailto:${address}?${fieldString}`;
}

function FeedbackLink(props) {
  const { version,
          userAgent,
          url,
          documentFingerprint,
          dateTime,
          auth } = props;

  const feedbackLink = {
    subject: 'Hypothesis feedback',
    body:
`Version: ${version}
User Agent: ${userAgent}
URL: ${url}
Document Fingerprint: ${documentFingerprint || '-'}
Username: ${auth.username || '-'}
Date: ${dateTime}
`,
  };

  return <div className="about-this-version-content-feedback">
    <a className="about-this-version-content-feedback__link"
       href={mailtoLink('support@hypothes.is', feedbackLink)}>
       Send us feedback
    </a>
  </div>;
}

module.exports = directive(FeedbackLink, {
  version: '<',
  userAgent: '<',
  url: '<',
  documentFingerprint: '<',
  auth: '<',
  dateTime: '<',
});
