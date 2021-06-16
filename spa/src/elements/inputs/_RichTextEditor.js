import React, { useState, useEffect } from 'react';
import * as S from './RichTextEditor.styled';
import { Editor, EditorState, RichUtils, getDefaultKeyBinding, convertFromHtml } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { stateToHTML } from 'draft-js-export-html';

function RichTextEditor({ onChange, initial }) {
  const [editorState, setEditorState] = useState(() => {
    if (initial) {
      return convertFromHtml(initial);
    }
    return EditorState.createEmpty();
  });
  const [wrapperClassName, setWrapperClassName] = useState('');

  const handleEditorStateChange = (editorState) => {
    setEditorState(editorState);
    onChange(stateToHTML(editorState.getCurrentContent()));
  };

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return true;
    }
    return false;
  };

  const mapKeyToEditorCommand = (e) => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(e, editorState, 4 /* maxDepth */);
      if (newEditorState !== editorState) {
        setEditorState(newEditorState);
      }
      return;
    }
    return getDefaultKeyBinding(e);
  };

  const toggleBlockType = (blockType) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };

  const toggleInlineStyle = (inlineStyle) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, inlineStyle));
  };

  useEffect(() => {
    const contentState = editorState.getCurrentContent();
    let className = 'RichEditor-editor';
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
        className += ' RichEditor-hidePlaceholder';
      }
    }
    setWrapperClassName(className);
  }, [editorState]);

  return (
    <S.RichTextEditorWrapper>
      <BlockStyleControls editorState={editorState} onToggle={toggleBlockType} />
      <InlineStyleControls editorState={editorState} onToggle={toggleInlineStyle} />
      <S.RichTextEditor className={wrapperClassName}>
        <Editor
          editorState={editorState}
          onChange={handleEditorStateChange}
          blockStyleFn={getBlockStyle}
          customStyleMap={styleMap}
          handleKeyCommand={handleKeyCommand}
          keyBindingFn={mapKeyToEditorCommand}
          placeholder="Tell a story..."
          spellCheck={true}
        />
      </S.RichTextEditor>
    </S.RichTextEditorWrapper>
  );
}

export default RichTextEditor;

// class RichEditorExample extends React.Component {
//   constructor(props) {
//     super(props);
//     // this.state = { editorState: EditorState.createEmpty() };
// //
//     // this.focus = () => this.refs.editor.focus();
//     // this.onChange = (editorState) => this.setState({ editorState });

//     this.handleKeyCommand = this._handleKeyCommand.bind(this);
//     this.mapKeyToEditorCommand = this._mapKeyToEditorCommand.bind(this);
//     this.toggleBlockType = this._toggleBlockType.bind(this);
//     this.toggleInlineStyle = this._toggleInlineStyle.bind(this);
//   }

// _handleKeyCommand(command, editorState) {
//   const newState = RichUtils.handleKeyCommand(editorState, command);
//   if (newState) {
//     this.onChange(newState);
//     return true;
//   }
//   return false;
// }

// _mapKeyToEditorCommand(e) {
//   if (e.keyCode === 9 /* TAB */) {
//     const newEditorState = RichUtils.onTab(e, this.state.editorState, 4 /* maxDepth */);
//     if (newEditorState !== this.state.editorState) {
//       this.onChange(newEditorState);
//     }
//     return;
//   }
//   return getDefaultKeyBinding(e);
// }

// _toggleBlockType(blockType) {
//   this.onChange(RichUtils.toggleBlockType(this.state.editorState, blockType));
// }

// _toggleInlineStyle(inlineStyle) {
//   this.onChange(RichUtils.toggleInlineStyle(this.state.editorState, inlineStyle));
// }

//   render() {
//     const { editorState } = this.state;

//     // If the user changes block type before entering any text, we can
//     // either style the placeholder or hide it. Let's just hide it now.
//     let className = 'RichEditor-editor';
//     var contentState = editorState.getCurrentContent();
//     if (!contentState.hasText()) {
//       if (contentState.getBlockMap().first().getType() !== 'unstyled') {
//         className += ' RichEditor-hidePlaceholder';
//       }
//     }

//     return (
//       <div className="RichEditor-root">
//         <BlockStyleControls editorState={editorState} onToggle={this.toggleBlockType} />
//         <InlineStyleControls editorState={editorState} onToggle={this.toggleInlineStyle} />
//         <div className={className} onClick={this.focus}>
//           <Editor
//             blockStyleFn={getBlockStyle}
//             customStyleMap={styleMap}
//             editorState={editorState}
//             handleKeyCommand={this.handleKeyCommand}
//             keyBindingFn={this.mapKeyToEditorCommand}
//             onChange={this.onChange}
//             placeholder="Tell a story..."
//             ref="editor"
//             spellCheck={true}
//           />
//         </div>
//       </div>
//     );
//   }
// }

// Custom overrides for "code" style.
const styleMap = {
  CODE: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2
  }
};

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote':
      return 'RichEditor-blockquote';
    default:
      return null;
  }
}

function StyleButton({ active, onToggle, style, label }) {
  const [className, setClassName] = useState('');

  const handleToggle = (e) => {
    e.preventDefault();
    onToggle(style);
  };

  useEffect(() => {
    let newClassName = 'RichEditor-styleButton';
    if (active) {
      newClassName += ' RichEditor-activeButton';
    }
    setClassName(newClassName);
  }, [active]);

  return (
    <span className={className} onMouseDown={handleToggle}>
      {label}
    </span>
  );
}

// class StyleButton extends React.Component {
//   constructor() {
//     super();
//     this.onToggle = (e) => {
//       e.preventDefault();
//       this.props.onToggle(this.props.style);
//     };
//   }

//   render() {
//     return (
//       <span className={className} onMouseDown={this.onToggle}>
//         {this.props.label}
//       </span>
//     );
//   }
// }

const BLOCK_TYPES = [
  { label: 'H2', style: 'header-two' },
  { label: 'H3', style: 'header-three' },
  { label: 'H4', style: 'header-four' },
  { label: 'H5', style: 'header-five' },
  { label: 'Blockquote', style: 'blockquote' },
  { label: 'UL', style: 'unordered-list-item' },
  { label: 'OL', style: 'ordered-list-item' }
];

const BlockStyleControls = ({ editorState, onToggle }) => {
  const selection = editorState.getSelection();
  const blockType = editorState.getCurrentContent().getBlockForKey(selection.getStartKey()).getType();

  return (
    <div className="RichEditor-controls">
      {BLOCK_TYPES.map((type) => (
        <StyleButton
          key={type.label}
          active={type.style === blockType}
          label={type.label}
          onToggle={onToggle}
          style={type.style}
        />
      ))}
    </div>
  );
};

var INLINE_STYLES = [
  { label: 'Bold', style: 'BOLD' },
  { label: 'Italic', style: 'ITALIC' },
  { label: 'Underline', style: 'UNDERLINE' },
  { label: 'Monospace', style: 'CODE' }
];

const InlineStyleControls = ({ editorState, onToggle }) => {
  const currentStyle = editorState.getCurrentInlineStyle();

  return (
    <div className="RichEditor-controls">
      {INLINE_STYLES.map((type) => (
        <StyleButton
          key={type.label}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={onToggle}
          style={type.style}
        />
      ))}
    </div>
  );
};
