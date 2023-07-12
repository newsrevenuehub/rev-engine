import styled from 'styled-components';

export const Corner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
`;

export const Label = styled.div<{ $disabled: boolean | null | undefined }>`
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  font-weight: 600;
  ${(props) => props.$disabled && 'color: #afafaf;'}

  button:active + & {
    color: ${({ theme }) => theme.colors.muiLightBlue[500]};
  }
`;

export const Preview = styled.button`
  border: none;
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  cursor: pointer;
  overflow: hidden;
  position: relative;

  &:disabled {
    cursor: auto;
  }

  & > * {
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
`;

export const Root = styled.div`
  display: grid;
  gap: 10px;
  /* Grid rows will be set inline based on props. */
  grid-template-columns: 1fr;
  position: relative;
`;
