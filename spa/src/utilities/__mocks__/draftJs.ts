import { EditorState } from 'draft-js';

export function htmlToEditorState(html: string) {
  return { mockEditorState: html };
}

export function editorStateToHtml(state: EditorState) {
  return JSON.stringify(state);
}
