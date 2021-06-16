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
      `No element editor avaialble for element type ${elementType}. Did you forget to define [ElementEditor].for property?`
    );
    return;
  }
  return <Editor />;
}

export default getElementEditor;
