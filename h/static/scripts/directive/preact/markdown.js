'use strict';

import classNames from 'classnames';
import debounce from 'lodash.debounce';
import {h, Component} from 'preact';

import directive from './directive';
import * as commands from '../../markdown-commands';
import * as mediaEmbedder from '../../media-embedder';
import renderMarkdown from '../../render-markdown';

/**
 * Implements the toolbar commands (Insert Bold, Italic etc.)
 * for the markdown editor.
 */
class EditorToolbarController {
  constructor(input) {
    this._input = input;
  }

  insertBold() {
    this._updateState(state =>
      commands.toggleSpanStyle(state, '**', '**', 'Bold'));
  }

  insertItalic() {
    this._updateState(state =>
      commands.toggleSpanStyle(state, '*', '*', 'Italic'));
  }

  insertMath() {
    this._updateState(state => {
      const before = state.text.slice(0, state.selectionStart);

      if (before.length === 0 ||
          before.slice(-1) === '\n' ||
          before.slice(-2) === '$$') {
        return commands.toggleSpanStyle(state, '$$', '$$', 'Insert LaTeX');
      } else {
        return commands.toggleSpanStyle(state, '\\(', '\\)',
                                            'Insert LaTeX');
      }
    });
  }

  insertLink() {
    this._updateState(state => commands.convertSelectionToLink(state));
  }

  insertImage() {
    this._updateState(state =>
      commands.convertSelectionToLink(state,
        commands.LinkType.IMAGE_LINK));
  }

  insertList() {
    this._updateState(state => commands.toggleBlockStyle(state, '* '));
  }

  insertNumList() {
    this._updateState(state => commands.toggleBlockStyle(state, '1. '));
  }

  insertQuote() {
    this._updateState(state => commands.toggleBlockStyle(state, '> '));
  }

  _updateState(newStateFn) {
    const input = this._input();
    const newState = newStateFn({
      text: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
    });

    input.value = newState.text;
    input.selectionStart = newState.selectionStart;
    input.selectionEnd = newState.selectionEnd;

    // The input field currently loses focus when the contents are
    // changed. This re-focuses the input field but really it should
    // happen automatically.
    input.focus();
  }
}

/** Toolbar for the markdown viewer. */
function Toolbar(props) {
  const {onTogglePreview} = props;
  const ctrl = new EditorToolbarController(props.input);

  const classes = classNames({
    'markdown-tools': true,
    disable: props.preview,
  });

  return <div className={classes}>
    <span className="markdown-preview-toggle">
      <a className="markdown-tools-badge h-icon-markdown"
         href="https://help.github.com/articles/markdown-basics"
         title="Parsed as Markdown" target="_blank"></a>
      <a href="" className="markdown-tools-toggle"
         onClick={onTogglePreview}>{props.preview ? 'Write' : 'Preview'}</a>
    </span>
    <i className="h-icon-format-bold markdown-tools-button"
       onClick={() => ctrl.insertBold()}
       title="Embolden text"></i>
    <i className="h-icon-format-italic markdown-tools-button"
       onClick={() => ctrl.insertItalic()}
      title="Italicize text"></i>
    <i className="h-icon-format-quote markdown-tools-button"
       onClick={() => ctrl.insertQuote()}
       title="Quote text"></i>
    <i className="h-icon-insert-link markdown-tools-button"
       onClick={() => ctrl.insertLink()}
       title="Insert link"></i>
    <i className="h-icon-insert-photo markdown-tools-button"
       onClick={() => ctrl.insertImage()}
       title="Insert image"></i>
    <i className="h-icon-functions markdown-tools-button"
       onClick={() => ctrl.insertMath()}
       title="Insert mathematical notation (LaTex is supported)"></i>
    <i className="h-icon-format-list-numbered markdown-tools-button"
       onClick={() => ctrl.insertNumList()}
       title="Insert numbered list"></i>
    <i className="h-icon-format-list-bulleted markdown-tools-button"
       onClick={() => ctrl.insertList()}
       title="Insert list"></i>
  </div>
}

// TODO:
// - Keyboard shortcuts for bold, italic, underline toolbar actions
// - Switch editor out of preview mode when exiting edit mode
class MarkdownViewer extends Component {
  constructor() {
    super();
    this.state = {preview: false};
  }

  componentDidUpdate(prevProps) {
    if (this._output && this.props.text !== prevProps.text) {
      mediaEmbedder.replaceLinksWithEmbeds(this._output);
    }
  }

  componentDidMount() {
    if (this._output) {
      mediaEmbedder.replaceLinksWithEmbeds(this._output);
    }
  }

  render() {
    const props = this.props;
    const html = renderMarkdown(props.text || '', function (html) {
      return props.$sanitize(html);
    });

    const showEditor = !props.readOnly && !this.state.preview;
    const onChange = e => props.onEditText({text: e.target.value});

    const viewerClasses = classNames({
      'markdown-body': true,
      'markdown-preview': this.state.preview,
    });

    return <div>
      {!props.readOnly ?
        <Toolbar onTogglePreview={() => this._togglePreview()}
                 input={() => this._input}
                 preview={this.state.preview}/>
      : null}
      {showEditor ?
        <textarea className="form-input form-textarea js-markdown-input"
                  onBlur={onChange}
                  onKeyup={onChange}
                  onChange={onChange}
                  onClick={e => e.stopPropagation()}
                  ref={n => this._focusInput(n)}>
          {props.text}
        </textarea> : null}
      {!showEditor ? <div className={viewerClasses}
           onDoubleClick={() => this._togglePreview()}
           ref={n => this._output = n}
           dangerouslySetInnerHTML={{__html: html}}/> : null}
    </div>;
  }

  _focusInput(node) {
    setTimeout(() => node.focus(), 0);
    this._input = node;
  }

  _togglePreview() {
    this.setState({preview: !this.state.preview});
  }
}

module.exports = directive(MarkdownViewer, {
  readOnly: '<',
  text: '<?',
  onEditText: '&',
}, ['$sanitize']);
