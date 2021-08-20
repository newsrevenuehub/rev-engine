import styled from 'styled-components';

export const StylePreview = styled.div`
  height: 100%;
`;

export const ColorSwatch = styled.div`
  height: 24%;
  background: ${(props) => props.color};

  &:not(:last-child) {
    margin-bottom: 1px;
  }
`;
