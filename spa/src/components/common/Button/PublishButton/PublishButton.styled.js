import styled from 'styled-components';
import { Button as MuiButton, Popover as MuiPopover } from '@material-ui/core';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Button = styled(MuiButton)`
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
      props.published &&
      `
       background-color: transparent;
       color: white;
       border: 1px solid white;

       :hover {
        background-color: #ffffff99;
       }

       ${
         props.active &&
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

export const Popover = styled(MuiPopover)`
  .MuiPaper-rounded {
    border-radius: ${(props) => props.theme.muiBorderRadius.xl};
    padding: 17px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 400px;

    @media (${(props) => props.theme.breakpoints.phoneOnly}) {
      max-width: calc(100% - 32px);
    }
  }
`;

export const UnpublishButton = styled(MuiButton)`
  && {
    color: white;
    width: 123px;
    line-height: 16px;
    align-self: end;
    font-weight: 600;
    padding: 10px 23px;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
    background-color: ${(props) => props.theme.colors.error.primary};

    :hover {
      background-color: ${(props) => `${props.theme.colors.error.primary}cc`};
    }
  }
`;

export const LiveText = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: ${(props) => props.theme.colors.muiTeal[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  font-weight: 600;

  svg {
    height: 20px;
    width: 20px;
  }
`;

export const Text = styled.p`
  color: ${(props) => props.theme.colors.muiGrey[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  font-weight: 500;
  margin: 0;
`;
