import * as elementEditors from './index';

function getElementEditor(elementType) {
  let Editor;
  Object.keys(elementEditors).forEach((key) => {
    if (elementEditors[key].for === elementType) {
      Editor = elementEditors[key];
    }
  });
  if (!Editor) {
    console.warn(
      `No element editor available for element type ${elementType}. Did you forget to define [ElementEditor].for property? Is it exported from elementEditors.index.js?`
    );
    return;
  }
  return <Editor />;
}

export default getElementEditor;

export function getElementValidator(elementType) {
  return elementEditors[_getEditorKey(elementType)]?.hasErrors;
}

export function getElementTextEditor(elementType) {
  const Editor = elementEditors[_getEditorKey(elementType)];
  if (Editor?.TextEditor) return <Editor.TextEditor />;
  return null;
}

function _getEditorKey(elementType) {
  return Object.keys(elementEditors).find((editorKey) => elementEditors[editorKey].for === elementType);
}
