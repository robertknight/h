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

function componentName(Component) {
  return Component.displayName || Component.name;
}

/**
 * Displays details of an error.
 *
 * A component that can be displayed in place of a source component
 * if rendering results in an error.
 *
 * In development, this displays a very loud and obvious error.
 * Clicking the box displays the details of the error.
 */
class ErrorBox extends preact.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  _toggleStacktrace() {
    this.setState({expanded: !this.state.expanded});
  }

  render() {
    // Render an error box to make the failed render very obvious.
    // This should be customized to report an error and display
    // something less dramatic in a production build
    var style = {
      backgroundColor: 'red',
      color: 'white',
      fontWeight: 'bold',
      padding: 5,
      marginTop: 10,
    };
    var stacktrace;
    if (this.state.expanded) {
      var stacktraceStyle = {
        backgroundColor: `rgba(255,255,255,0.3)`,
        padding: 10,
        maxHeight: 150,
        overflow: 'auto',
      };
      var messageStyle = { marginBottom: 5 };
      stacktrace = <div style={stacktraceStyle} onClick={e => e.stopPropagation()}>
        <p style={messageStyle}>{this.props.error.message}</p>
        {this.props.error.stack}
      </div>
    }
    var sadFaceStyle = {
      fontSize: 25,
      fontWeight: 'normal',
      margin: 5,
    };
    return <div style={style}
      onClick={() => this._toggleStacktrace()}
      title="Toggle error details"
      >
      Failed to render {componentName(this.props.Component)}
        <span style={sadFaceStyle}>😞</span>
      {stacktrace}
    </div>;
  }
}

/**
 * Creates an Angular directive which renders a preact component.
 *
 * This provides a way to render a subtree of preact components inside
 * a larger Angular application.
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
        // The current input property values for the next render
        var propValues = {};
        // Set to true when a change in at least one of the input
        // properties has been detected in the current $digest cycle.
        var renderScheduled = false;

        // Update the rendered preact component when the inputs
        // change
        function render() {
          renderScheduled = false;
          var root = elem[0];

          // The third argument to preact.render() is the element to replace.
          // preact doesn't like this being an empty text node.
          var replacedElement;
          if (root.lastChild && root.lastChild.nodeType === Node.ELEMENT_NODE) {
            replacedElement = root.lastChild;
          }

          try {
            var reactElement = preact.h(Component, propValues);
            preact.render(reactElement, root, replacedElement);
          } catch (err) {
            // Render an error box to make the failed render very obvious.
            // This should be customized to report an error and display
            // something less dramatic in a production build
            console.error(`Error rendering ${componentName(Component)}:`, err);
            preact.render(<ErrorBox Component={Component} error={err}/>,
              root, replacedElement);
          }
        }

        // Watch the input properties to the component from
        // the Angular directive and re-render the preact component tree
        // when they change.
        //
        // We're watching each property with a separate $watch here,
        // but we could probably do better with a custom watch function.
        Object.keys(props).forEach(function (prop) {
          scope.$watch(prop, function (newValue) {
            propValues[prop] = newValue;
            if (!renderScheduled) {
              renderScheduled = true;
              // Re-render at the end of the $digest loop.
              // Using $applyAsync causes us to only re-render once, even
              // if several of the input properties change.
              //
              // Additional debouncing could also be done here to reduce
              // the frequency of updates.
              scope.$applyAsync(render);
            }
          });
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

function ReplyCountLink(props) {
  // FIXME - Angular is passing replyCount as a string instead
  // of a number
  var replyCount = props.replyCount|0;
  if (replyCount === 0) {
    return null;
  }

  var replyText = 'no-replies';
  if (replyCount === 1) {
    replyText = '1 reply';
  } else {
    replyText = replyCount + ' replies';
  }
  return <span class="annotation-collapsed-replies">
    <a class="annotation-link" href=""
      onClick={props.onClick}>{replyText}</a>
  </span>
}

/**
 * Header for an annotation card displaying
 */
function AnnotationHeader(props) {
  return <header class="annotation-header">
    {props.user ? <span>
      <UserLabel user={props.user}/>
      <ReplyCountLink replyCount={props.replyCount}
                      onClick={props.replyCountClick}/>

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

function AnnotationActions(props) {
  if (props.isSaving) {
    return <div>Saving…</div>;
  }

  if (props.isEditing || !props.id) {
    return null;
  }

  var annotationURI = settings.serviceUrl + 'a/' + props.id;

  return <div class="annotation-actions">
    <button class="small btn btn-clean"
            onClick={() => props.onReply()}
            ><i class="h-icon-reply btn-icon"></i> Reply</button>
    <span class="share-dialog-wrapper">
      <button class="small btn btn-clean"
              onClick={e => props.onShare({$event: e})}
              ><i class="h-icon-link btn-icon"></i> Link</button>
      <span class="share-dialog" onClick={e => e.stopPropagation()}>
        <a target="_blank"
           class="h-icon-link"
           href={annotationURI}
           title="Open in new tab"></a>
        <input type="text" value={annotationURI} readonly/>
      </span>
    </span>
    {props.canUpdate ? <button class="small btn btn-clean"
            onClick={() => props.onEdit()}
            ><i class="h-icon-edit btn-icon"></i> Edit</button> : null}
    {props.canDelete ?
    <button class="small btn btn-clean"
            onClick={() => props.onDelete()}
            ><i class="h-icon-delete btn-icon"></i> Delete…</button> : null}
  </div>
}

var userLabel = directive(UserLabel, {
  user: '=',
});

var annotationDocumentInfo = directive(AnnotationDocumentInfo, {
  document: '=',
  group: '=',
  isEditing: '=',
  isHighlight: '=',
  isPrivate: '=',
  showCitation: '=',
});

var annotationHeader = directive(AnnotationHeader, {
  document: '=',
  group: '=',
  id: '=',
  isEditing: '=',
  isHighlight: '=',
  isPrivate: '=',
  showCitation: '=',
  updated: '=',
  user: '=',
});

var annotationActions = directive(AnnotationActions, {
  canDelete: '=',
  canUpdate: '=',
  id: '=',
  isEditing: '=',
  isSaving: '=',
  onEdit: '&',
  onReply: '&',
  onShare: '&',
  onDelete: '&',
});

var replyCountLink = directive(ReplyCountLink, {
  onClick: '&',
  replyCount: '=',
});

module.exports = {
  directive: directive,
  userLabel: userLabel,
  annotationDocumentInfo: annotationDocumentInfo,
  annotationHeader: annotationHeader,
  annotationActions: annotationActions,
  replyCountLink: replyCountLink,
};
