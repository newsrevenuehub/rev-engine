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
      `No element editor avaialble for element type ${elementType}. Did you forget to define [ElementEditor].for property? Is it exported from elementEditors.index.js?`
    );
    return;
  }
  return <Editor />;
}

export function getElementValidator(elementType) {
  const editorKey = Object.keys(elementEditors).find((editorKey) => elementEditors[editorKey].for === elementType);
  return elementEditors[editorKey]?.hasErrors;
}

export default getElementEditor;
