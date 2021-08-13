import styled from 'styled-components';

export const DRichText = styled.div`
  margin: 2rem 0;
`;

export const RichTextContent = styled.div`
  p,
  ul,
  li {
    line-height: 1.6;
  }

  blockquote {
    padding: 0.5rem 0 0.5rem 1rem;
    border-left: 6px solid ${(props) => props.theme.colors.grey[0]};
    line-height: 1.6;

    font-weight: 200;
  }
`;
