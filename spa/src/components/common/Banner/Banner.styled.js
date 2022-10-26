import styled from 'styled-components';
import lighten from 'styles/utils/lighten';

import BaseButton from 'components/base/Button';
import { BANNER_TYPE } from 'constants/bannerConstants';

export const Flex = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  font-family: ${(props) => props.theme.systemFont};
  background-color ${(props) =>
    props.type === BANNER_TYPE.BLUE
      ? props.theme.buttons.blue.backgroundLight
      : props.theme.buttons.yellow.backgroundLight};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
`;

export const Button = styled(BaseButton)`
  && {
    margin-left: 10px;
    padding: 11px 30px;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};

    ${(props) =>
      props.type === BANNER_TYPE.BLUE &&
      `
      && {
        .MuiButton-label {
          color: ${props.theme.colors.white};
        }
        background-color: ${props.theme.buttons.blue.background};
        border: ${props.theme.buttons.blue.border};

        &:hover {
          background-color: ${lighten(props.theme.buttons.blue.background, 9)};
          border-color: ${lighten(props.theme.buttons.blue.background, 9)};
        }
      }
  `}
  }
`;

export const Label = styled.p`
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 400;
  margin: 0;
`;
