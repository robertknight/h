import * as preact from 'preact';
import {h} from 'preact';

import {parseAccountID} from '../filter/persona';

import documentTitleFilter from '../filter/document-title';
import documentDomainFilter from '../filter/document-domain';

import angular from 'angular';

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
     href={`${props.serviceUrl}/u${props.user}`}
     >{accountName}</a>
}

function AnnotationHeader(props) {
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

var userLabel = directive(UserLabel, {
  user: '=',
});

var annotationHeader = directive(AnnotationHeader, {
  document: '=',
  group: '=',
  isEditing: '=',
  isHighlight: '=',
  showCitation: '=',
  isPrivate: '=',
});

module.exports = {
  directive: directive,
  userLabel: userLabel,
  annotationHeader: annotationHeader,
};
