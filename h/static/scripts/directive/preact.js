import * as preact from 'preact';
import {h} from 'preact';

import {parseAccountID} from '../filter/persona';

import documentTitleFilter from '../filter/document-title';
import documentDomainFilter from '../filter/document-domain';

import angular from 'angular';

import * as dateUtil from '../date-util';

var time = require('../time')();
var settings = require('../settings')([document]);

var documentTitleFn = documentTitleFilter();
var documentDomainFn = documentDomainFilter();

/**
 * Creates an Angular wrapper around a preact component.
 */
function directive(Component, props) {
  return function () {
    return {
      restrict: 'E',
      scope: props,
      link: function (scope, elem) {
        var propValues = {};
        var renderScheduled = false;

        function render() {
          // FIXME - This shouldn't be needed
          elem[0].innerHTML = '';
          renderScheduled = false;
          preact.render(preact.h(Component, propValues), elem[0]);
        }

        // Watch the input properties from Angular for changes
        // and re-render the component if the inputs change.
        Object.keys(props).forEach(function (prop) {
          scope.$watch(prop, function (newValue) {
            propValues[prop] = newValue;
            if (!renderScheduled) {
              renderScheduled = true;
              scope.$applyAsync(render);
            }
          }, true /* use angular.equals() */);
        });
      }
    }
  };
}

function UserLabel(props) {
  var accountName = parseAccountID(props.user).username;
  return <a class="annotation-user"
     target="_blank"
     href={`${settings.serviceUrl}/u${props.user}`}
     >{accountName}</a>
}

function AnnotationDocumentInfo(props) {
  console.log('rendering AnnotationHeader', props);
  var group = props.group;
  var document = props.document;
  var isHighlight = props.isHighlight;
  var isEditing = props.isEditing;
  var documentTitle = documentTitleFn(document);
  var documentDomain = documentDomainFn(document);
  var isPrivate = props.isPrivate;
  var showCitation = props.showCitation;

  return <span class="annotation-header__share-info">
    {group && group.url ? <a class="annotation-header__group"
       target="_blank" href={group.url}>
      <i class="h-icon-group"></i><span class="annotation-header__group-name">{group.name}</span>
    </a> : null}
    {isPrivate ? <span title="This annotation is visible only to you.">
      <i class="h-icon-lock"></i>
        {group.url ? <span class="annotation-header__group-name">Only me</span> : null}
    </span> : null}
    {isHighlight && isEditing ?
      <i class="h-icon-border-color" title="This is a highlight. Click 'edit' to add a note or tag."></i>
    : null}
    {showCitation ? <span class="annotation-citation" dangerouslySetInnerHTML={{ __html: documentTitle }}></span> : null}
    {showCitation ? <span class="annotation-citation-domain" dangerouslySetInnerHTML={{ __html: documentDomain}}></span> : null}
  </span>
}

function AnnotationHeader(props) {
  var relativeTimestamp = time.toFuzzyString(props.updated);
  var absoluteTimestamp = dateUtil.format(new Date(props.updated));

  var replyText = '';
  if (props.replyCount === 1) {
    replyText = '1 reply';
  } else {
    replyText = props.replyCount + ' replies';
  }

  return <header class="annotation-header">
    {props.user ? <span>
      <UserLabel user={props.user}/>

      <span class="annotation-collapsed-replies">
        <a class="annotation-link" href=""
          onClick={() => props.replyCountClick()}>{replyText}</a>
      </span>

      <br/>

      <AnnotationDocumentInfo
        document={props.document}
        group={props.group}
        is-editing={props.isEditing}
        is-highlight={props.isHighlight}
        show-citation={props.showCitation}
        is-private={props.isPrivate}/>
    </span> : null}

    <span class="u-flex-spacer"></span>

    {!props.isEditing && props.updated ? <a class="annotation-link"
       target="_blank"
       title={absoluteTimestamp}
       href={settings.serviceUrl + 'a/' + props.id}
       >{relativeTimestamp}</a> : null}
  </header>
}

var userLabel = directive(UserLabel, {
  user: '=',
});

var annotationDocumentInfo = directive(AnnotationDocumentInfo, {
  document: '=',
  group: '=',
  isEditing: '=',
  isHighlight: '=',
  showCitation: '=',
  isPrivate: '=',
});

var annotationHeader = directive(AnnotationHeader, {
  document: '=',
  group: '=',
  isEditing: '=',
  isHighlight: '=',
  showCitation: '=',
  isPrivate: '=',
  user: '=',
  id: '=',
  updated: '=',
});

module.exports = {
  directive: directive,
  userLabel: userLabel,
  annotationDocumentInfo: annotationDocumentInfo,
  annotationHeader: annotationHeader,
};
