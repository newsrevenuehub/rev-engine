import styled from 'styled-components';
import lighten from 'styles/utils/lighten';
import darken from 'styles/utils/darken';

import { BANNER_TYPE } from 'constants/bannerConstants';

export const Flex = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  font-family: ${(props) => props.theme.systemFont};
  background-color ${(props) =>
    props.type === BANNER_TYPE.STRIPE
      ? props.theme.buttons.blue.backgroundLight
      : props.theme.buttons.yellow.backgroundLight};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
`;

export const Button = styled.button`
  margin-left: 10px;
  padding: 11px 30px;
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 600;
  color: ${(props) => props.theme.colors.sidebarBackground};
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  border: ${(props) => props.theme.buttons.yellow.border};
  box-shadow: ${(props) => props.theme.buttons.yellow.boxShadow};
  cursor: pointer;
  background-color: ${(props) => props.theme.buttons.yellow.background};

  &:hover {
    background-color: ${(props) => darken(props.theme.buttons.yellow.background, 10)};
    border-color: ${(props) => darken(props.theme.buttons.yellow.background, 10)};
  }

  ${(props) =>
    props.type === BANNER_TYPE.STRIPE &&
    `
    color: ${props.theme.colors.white};
    background-color: ${props.theme.buttons.blue.background};
    border: ${props.theme.buttons.blue.border};

    &:hover {
      background-color: ${lighten(props.theme.buttons.blue.background, 9)};
      border-color: ${lighten(props.theme.buttons.blue.background, 9)};
    }
  `}
`;

export const Label = styled.p`
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 400;
  margin: 0;
`;
