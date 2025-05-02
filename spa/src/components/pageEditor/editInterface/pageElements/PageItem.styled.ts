import { DragIndicatorOutlined } from '@material-ui/icons';
import { IconButton } from 'components/base';
import styled from 'styled-components';

export const Root = styled.div<{ $disabled: boolean; $isStatic: boolean }>`
  align-items: center;
  background-color: ${(props) => (props.$disabled ? '#f9f9f9' : props.theme.basePalette.greyscale.white)};
  border: 1px solid ${({ theme }) => theme.basePalette.primary.purple};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  cursor: ${(props) => (props.$disabled ? 'not-allowed' : props.$isStatic ? 'pointer' : 'grab')};
  display: flex;
  position: relative;
  transition: background-color 0.3s;

  ${(props) =>
    !props.$disabled &&
    `&:hover {
    box-shadow: 0px 3px 7px 0px #00000033, 0px 0.800000011920929px 3px 0px #00000014;
  }`};

  ${(props) => props.$isStatic && 'display: block; padding: 0 16px;'}
`;

export const Description = styled.p<{ $disabled: boolean }>`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  /* Cheat the gap tighter. */
  margin-top: -8px;
  padding-bottom: 18px;
  ${(props) => props.$disabled && `color: ${props.theme.basePalette.greyscale['30']}`}
`;

export const DragIndicator = styled(DragIndicatorOutlined)`
  color: #d9d9d9;
  margin-left: 8px;
  visibility: hidden;

  ${Root}:hover & {
    visibility: visible;
  }
`;

export const Header = styled.h5<{ $disabled: boolean }>`
  align-self: center;
  flex-grow: 1;
  font-family: ${(props) => props.theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 500;
  margin: 0;
  padding: 16px 16px 16px 0;

  ${(props) => props.$disabled && `color: ${props.theme.basePalette.greyscale['30']}`}
`;

export const Controls = styled.div`
  padding-right: 10px;
`;

export const ControlIconButton = styled(IconButton)<{ $delete?: boolean; $rounding: 'left' | 'right' | 'both' }>`
  && {
    border: 1px solid ${({ theme }) => theme.basePalette.greyscale['30']};
    height: 38px;
    width: 38px;

    ${(props) => {
      switch (props.$rounding) {
        case 'left':
          return `
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
          border-right: none;
        `;
        case 'right':
          return `
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        `;
      }
    }}

    svg {
      width: 24px;
      height: 24px;
    }

    &:hover {
      background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
    }

    ${(props) =>
      props.$delete &&
      `
      &:hover {
        background-color: #f6e9ec;

        svg {
          color: ${props.theme.basePalette.secondary.error};
        }
      }`}
  }
`;
