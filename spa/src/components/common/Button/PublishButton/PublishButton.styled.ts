import styled from 'styled-components';
import { Button as MuiButton } from '@material-ui/core';

export const Root = styled.div`
  font-family: ${(props) => props.theme.systemFont};
`;

export const RootButton = styled(MuiButton)<{ $active?: boolean; $published?: boolean }>`
  && {
    height: 36px;
    font-weight: 600;
    line-height: 16px;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
    background-color: ${(props) => props.theme.colors.muiYellow.A100};

    :hover {
      background-color: ${(props) => `${props.theme.colors.muiYellow.A100}cc`};
    }

    :disabled {
      background-color: ${(props) => props.theme.colors.muiYellow.A50};
    }

    ${(props) =>
      props.$published &&
      `
       background-color: transparent;
       color: white;
       border: 1px solid white;

       :hover {
        background-color: #ffffff99;
       }

       ${
         props.$active &&
         `
        background-color: white;
        color: ${props.theme.colors.topbarBackground};
       `
       }

       :active {
        background-color: white;
        color: ${props.theme.colors.topbarBackground};
      }
    `}
  }
`;
