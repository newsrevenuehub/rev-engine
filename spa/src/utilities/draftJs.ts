import { ContentBlock, ContentState, EditorState } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import htmlToDraft from 'html-to-draftjs';
import { Set } from 'immutable';

// These are designed to match up to the toolbar settings in <RichTextEditor />.
// 🚨 These values are persisted to the back end, so any changes will probably
// mean a DB migration will be required. Changes also need to be made manually
// to <RichTextDisplay />.

export const alignClassNames = {
  center: 'nre-draftjs-text-align-center',
  left: 'nre-draftjs-text-align-left',
  right: 'nre-draftjs-text-align-right'
};

export const fontSizeClassNames = {
  '13': 'nre-draftjs-font-size-13',
  '14': 'nre-draftjs-font-size-14',
  '15': 'nre-draftjs-font-size-15',
  '16': 'nre-draftjs-font-size-16',
  '24': 'nre-draftjs-font-size-24'
};

/**
 * Returns an HTML representation of a DraftJs editor state with our custom
 * classes for text alignment and size applied.
 *
 * Specifically:
 * - `nre-draftjs-text-align-left`, `nre-draftjs-text-align-right`, `nre-draftjs-text-align-center`
 * - `nre-draftjs-fontsize-14`, `nre-draftjs-fontsize-16`, etc
 */
export function editorStateToHtml(editorState: EditorState) {
  return stateToHTML(editorState.getCurrentContent(), {
    // There seems to be a bug in draft-js-export-html's type definitions that
    // omit the inlineStyleFn property, but it works and is documented:
    // https://github.com/sstur/draft-js-utils/tree/master/packages/draft-js-export-html#inlinestylesfn
    //
    // Because of this, we have to cast this as any and manually assign types :(

    blockStyleFn(block: ContentBlock) {
      const align = block.getData().get('text-align');

      if (align && align in alignClassNames) {
        return { attributes: { class: alignClassNames[align as keyof typeof alignClassNames] } };
      }
    },
    inlineStyleFn(styles: Set<string>) {
      const fontSize = styles.find((value) => (value ? value.startsWith('fontsize') : false));

      if (fontSize) {
        const fontSizeTrimmed = fontSize.replace('fontsize-', '');

        if (fontSizeTrimmed in fontSizeClassNames) {
          return { attributes: { class: fontSizeClassNames[fontSizeTrimmed as keyof typeof fontSizeClassNames] } };
        }
      }
    }
  } as any);
}

/**
 * Creates a DraftJS editor state from HTML, reversing CSS class conversions
 * done by `editorStateToHtml()`. This will fail to parse arbitrary and
 * malformed HTML and will remove tags--to be safe, only use HTML that was
 * generated by `editorStateToHtml()` from this module.
 */
export function htmlToEditorState(html: string) {
  // Using DraftJS's built-in convertFromHTML function doesn't seem to parse
  // inline styles the way html-to-draftjs does. But html-to-draftjs also seems
  // to have problems; using their example custom converter causes the error
  // "Error: Unknown DraftEntity key". To get around this, we massage the incoming HTML.

  const container = document.createElement('div');

  container.innerHTML = html;

  for (const [align, className] of Object.entries(alignClassNames)) {
    for (const alignedEl of Array.from(container.querySelectorAll(`.${className}`))) {
      alignedEl.classList.remove(className);
      (alignedEl as HTMLElement).style.textAlign = align;
    }
  }

  for (const [fontSizePx, className] of Object.entries(fontSizeClassNames)) {
    for (const alignedEl of Array.from(container.querySelectorAll(`.${className}`))) {
      alignedEl.classList.remove(className);
      (alignedEl as HTMLElement).style.fontSize = `${fontSizePx}px`;
    }
  }

  const { contentBlocks, entityMap } = htmlToDraft(container.innerHTML);
  const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);

  return EditorState.createWithContent(contentState);
}
