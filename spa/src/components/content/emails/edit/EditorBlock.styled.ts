import { EditorContent as BaseEditorContent } from '@tiptap/react';
import styled from 'styled-components';

export const EditorContent = styled(BaseEditorContent)`
  & .ProseMirror {
    outline: 1px solid ${({ theme }) => theme.basePalette.primary.engineBlue};
    padding: 12px 20px;

    &:hover {
      outline: 2px solid ${({ theme }) => theme.basePalette.primary.engineBlue};
    }

    & span {
      /* Need to specify this for font-size spans; otherwise, lines get very tight when font size is increased. */
      line-height: 120%;
    }
  }

  & .ProseMirror-focused {
    outline: 2px solid ${({ theme }) => theme.basePalette.primary.brandBlue};
  }
`;
