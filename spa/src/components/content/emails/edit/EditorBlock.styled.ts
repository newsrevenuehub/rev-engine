import { EditorContent as BaseEditorContent } from '@tiptap/react';
import styled from 'styled-components';

export const EditorContent = styled(BaseEditorContent)`
  & .ProseMirror {
    outline: 1px solid ${({ theme }) => theme.basePalette.primary.engineBlue};
    padding: 12px 20px;
  }

  & .ProseMirror-focused {
    outline: 2px solid ${({ theme }) => theme.basePalette.primary.brandBlue};
  }
`;
