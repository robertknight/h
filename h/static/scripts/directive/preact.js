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
 * Creates an Angular directive which displays a preact component.
 *
 * @param {preact.Component|Function} Component - The preact component
 *                                                constructor.
 * @param {Object} props - Object specifying the names and types of properties
 *                         passed from Angular to preact.
 *                         This takes the same format as the 'scope'
 *                         property of Angular directives.
 *
 *                         eg. { count: '=', onClick: '&' }
 */
function directive(Component, props) {
  return function () {
    return {
      restrict: 'E',
      scope: props,
      link: function (scope, elem) {
        var propValues = {};
        var renderScheduled = false;
        var firstRender = true;

        // Update the rendered preact component when
        function render() {
          renderScheduled = false;
          var root = elem[0];
          var replacedElement = firstRender ? undefined : root.lastChild;
          preact.render(preact.h(Component, propValues), root, replacedElement);
          firstRender = false;
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

/**
 * A label displaying an annotator's username and linking to their account.
 */
function UserLabel(props) {
  var accountName = parseAccountID(props.user).username;
  return <a class="annotation-user"
     target="_blank"
     href={`${settings.serviceUrl}/u${props.user}`}
     >{accountName}</a>
}

/**
 * Section of an annotation card header displaying privacy and group info.
 */
function AnnotationDocumentInfo(props) {
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

/**
 * Link to an annotation which displays the relative age of the annotation
 * and updates itself dynamically.
 */
class AnnotationTimestamp extends preact.Component {
  _updateTimestamp() {
    var relativeTimestamp = time.toFuzzyString(this.props.updated);
    var absoluteTimestamp = '';
    if (this.props.updated) {
      absoluteTimestamp = dateUtil.format(new Date(this.props.updated));
    }

    this.setState({
      relativeTimestamp,
      absoluteTimestamp,
    })
  }

  _resetTimer() {
    if (this.cancelRefresh) {
      this.cancelRefresh();
    }
    this.cancelRefresh = time.decayingInterval(this.props.updated, () => {
      this._updateTimestamp();
    });
    this._updateTimestamp();
  }

  constructor(props) {
    super(props);
    this.state = {
      relativeTimestamp: '',
      absoluteTimestamp: '',
    };
    this._resetTimer();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.updated !== nextProps.updated) {
      this._resetTimer();
    }
  }

  componentDidUpdate() {
    this._updateTimestamp();
  }

  render() {
    return <a class="annotation-link"
       target="_blank"
       title={this.state.absoluteTimestamp}
       href={settings.serviceUrl + 'a/' + this.props.id}
       >{this.state.relativeTimestamp}</a>
  }

  componentWillUnmount() {
    if (this.cancelRefresh) {
      this.cancelRefresh();
    }
  }
}

/**
 * Header for an annotation card displaying
 */
function AnnotationHeader(props) {
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

    {!props.isEditing && props.updated ?
      <AnnotationTimestamp id={props.id} updated={props.updated}/> : null}
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
