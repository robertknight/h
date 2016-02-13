import * as preact from 'preact';
import {h} from 'preact';

import {parseAccountID} from '../filter/persona';

import documentTitleFilter from '../filter/document-title';
import documentDomainFilter from '../filter/document-domain';

import * as dateUtil from '../date-util';

import directive from './preact-directive';

var time = require('../time')();
var settings = require('../settings')([document]);

var documentTitleFn = documentTitleFilter();
var documentDomainFn = documentDomainFilter();

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
  userLabel: userLabel,
  annotationDocumentInfo: annotationDocumentInfo,
  annotationHeader: annotationHeader,
  annotationActions: annotationActions,
  replyCountLink: replyCountLink,
};
