import { IconButton } from 'components/base';
import styled from 'styled-components';

export const Root = styled.div<{ $disabled: boolean; $isStatic: boolean }>`
  background-color: ${(props) =>
    props.$disabled ? props.theme.basePalette.greyscale.grey4 : props.theme.basePalette.greyscale.white};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  box-shadow:
    0px 3px 4px 0px rgba(0, 0, 0, 0.12),
    -2px 0px 2px 0px rgba(0, 0, 0, 0.08);
  color: ${(props) =>
    props.$disabled ? props.theme.basePalette.greyscale.grey1 : props.theme.basePalette.greyscale.black};
  cursor: ${(props) => (props.$disabled ? 'not-allowed' : props.$isStatic ? 'pointer' : 'grab')};
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr 82px;
  padding-left: 28px;
  position: relative;
  transition: background-color 0.3s;

  ${(props) =>
    !props.$disabled &&
    `&:hover {
    background-color: ${props.theme.basePalette.greyscale.grey4};
    box-shadow:
      0px 3px 12px 0px rgba(0, 0, 0, 0.12),
      -2px 0px 10px 0px rgba(0, 0, 0, 0.16);
  }`};

  ${(props) =>
    !props.$isStatic &&
    `
    ::before {
      bottom: 6px;
      content: '';
      position: absolute;
      top: 6px;
      left: 12px;
      width: 6px;
      background: repeating-linear-gradient(to right, ${props.theme.basePalette.greyscale.grey3}, ${props.theme.basePalette.greyscale.grey3} 2px, transparent 2px, transparent 4px);
    }
  `}
`;

export const Header = styled.div`
  align-content: center;
  display: grid;
  gap: 6px;
  grid-template-columns: 24px 1fr;
  grid-template-rows: 26px;
  grid-template-areas:
    'icon title'
    'description description';
  justify-content: stretch;
  padding-top: 6px;
`;

export const HeaderIcon = styled.div<{ $disabled: boolean }>`
  grid-area: icon;
  align-self: center;

  svg {
    color: ${(props) => (props.$disabled ? props.theme.colors.disabled : props.theme.basePalette.primary.engineBlue)};
    fill: ${(props) => (props.$disabled ? props.theme.colors.disabled : props.theme.basePalette.primary.engineBlue)};
    height: 24px;
    width: 24px;
  }
`;

export const HeaderDescription = styled.p`
  font-family: ${(props) => props.theme.systemFont};
  grid-area: description;
  margin: 0;
  padding-bottom: 6px;
`;

export const HeaderTitle = styled.h5<{ $disabled: boolean }>`
  align-self: center;
  font-family: ${(props) => props.theme.systemFont};
  grid-area: title;
  margin: 0;

  ${(props) => props.$disabled && `color: ${props.theme.basePalette.greyscale.grey2}`}
`;

export const Controls = styled.div`
  align-self: stretch;
  display: flex;
  justify-content: end;
`;

export const ControlIconButton = styled(IconButton)<{ $delete?: boolean }>`
  && {
    /* border-left: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey3}; */
    border-radius: 0;
    height: 100%;

    svg {
      width: 20px;
      height: 20px;
    }

    &:hover svg {
      color: ${({ theme }) => theme.basePalette.secondary.error};
    }
  }
`;
