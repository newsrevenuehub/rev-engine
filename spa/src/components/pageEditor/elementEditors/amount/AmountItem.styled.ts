import { ButtonBase } from '@material-ui/core';
import { Close } from '@material-ui/icons';
import styled from 'styled-components';

export const Root = styled.div<{ $isDefault: boolean }>`
  align-items: center;
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  box-shadow:
    0 0.3px 0.5px rgba(0, 0, 0, 0.02),
    0px 2px 4px rgba(0, 0, 0, 0.08);
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  display: inline-flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  height: 35px;
  min-width: 100px;
  padding: 10px;

  ${(props) =>
    props.$isDefault &&
    `
        background: ${props.theme.colors.muiLightBlue[800]};
        box-shadow: none;
        color: ${props.theme.colors.white};
      `}
`;

export const NumberButton = styled(ButtonBase)`
  flex-grow: 1;
  font-weight: 600;
`;

export const RemoveIcon = styled(Close)<{ $isDefault: boolean }>`
  color: ${(props) => (props.$isDefault ? props.theme.colors.white : props.theme.colors.muiGrey[400])};
  height: 24px;
  width: 24px;
`;
