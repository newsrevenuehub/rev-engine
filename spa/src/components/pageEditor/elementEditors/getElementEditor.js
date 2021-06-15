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
  let validator;
  Object.keys(elementEditors).forEach((key) => {
    if (elementEditors[key].for === elementType) {
      validator = elementEditors[key].hasErrors;
    }
  });
  return validator;
}

export default getElementEditor;
