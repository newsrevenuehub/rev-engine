import styled from 'styled-components';

export const RichTextEditorWrapper = styled.div`
  padding: 0 2rem;
  & div.rdw-link-wrapper {
    width: 100%;
  }

  & div.rdw-editor-main {
    border: 1px solid ${(props) => props.theme.colors.grey[0]};
    padding: 0.5rem;
  }
`;
