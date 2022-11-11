import { BUTTON_TYPE, BUTTON_TYPE_ENUM } from 'constants/buttonConstants';
import styled from 'styled-components';
import lighten from 'styles/utils/lighten';

export const Flex = styled.div<{ disabled: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: start;
  font-family: ${(props) => props.theme.systemFont};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};
  color: ${(props) => (props.disabled ? '#AFAFAF' : 'inherit')};
`;

export const Button = styled.button<{ customType: BUTTON_TYPE_ENUM }>`
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${(props) =>
    props.disabled ? props.theme.colors.status.processing : props.theme.colors.muiLightBlue[800]};
  height: ${(props) => (props.customType === BUTTON_TYPE.PAGE ? '120px' : '70px')};
  width: 168px;
  font-size: ${(props) => props.theme.fontSizesUpdated.h1};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  font-weight: 600;
  border-color: transparent;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => lighten(props.theme.colors.muiLightBlue[800], 5)};
  }

  &:active {
    background-color: ${(props) => props.theme.colors.muiLightBlue[500]};
  }
`;

export const Label = styled.label`
  margin-top: 0.75rem;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  font-weight: 600;

  ${Flex}:active & {
    color: ${(props) => props.theme.colors.muiLightBlue[500]};
  }
`;
