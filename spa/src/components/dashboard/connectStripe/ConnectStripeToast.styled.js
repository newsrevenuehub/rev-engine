import { Button as MuiButton } from '@material-ui/core';
import styled from 'styled-components';

export const ConnectStripeToast = styled.div`
  position: absolute;
  top: 58px;
  right: 10px;
  font-family: ${(props) => props.theme.systemFont};
  border: 0.5px solid ${(props) => props.theme.colors.grey[0]};
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  width: 90%;
  max-width: 300px;
  padding: 11px 17px 17px;
  z-index: 100;
  background-color: ${(props) => props.theme.colors.white};
`;

export const ConnectStripeToastCollapsed = styled.div`
  position: absolute;
  top: 58px;
  right: 10px;
  background: ${(props) => props.theme.colors.white};
  border: 0.5px solid ${(props) => props.theme.colors.grey[0]};
  box-shadow: 0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  max-width: 96px;
  z-index: 100;
  cursor: pointer;

  span {
    display: none;
  }

  :hover span {
    display: block;
  }
`;

export const StripeLogo = styled.img`
  width: 54px;
  text-align: left;
`;

export const BottomLeftImage = styled.img`
  width: 14px;
  position: absolute;
  bottom: 4px;
  left: 4px;
`;

export const StripeLogoCollapsed = styled.img`
  height: 24px;
  margin: 26px 18px;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

export const Minimize = styled.div`
  margin-left: auto;
  padding: 0px 2px;
  height: 24px;
  cursor: pointer;
  svg {
    color: ${(props) => props.theme.colors.grey[2]};
    height: 24px;
    width: 24px;
  }
  :hover {
    background-color: ${(props) => props.theme.colors.grey[0]};
  }
`;

export const Heading = styled.div`
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.purple};
  padding-bottom: 9px;
`;

export const Description = styled.p`
  font-size: 12px;
  line-height: 15px;
  color: ${(props) => props.theme.colors.greyDark};
  margin-bottom: 0px;
`;

export const Button = styled(MuiButton)`
  && {
    width: 100%;
    height: 36px;
    background: ${(props) => props.theme.colors.buttons.yellow.background};
    border: ${(props) => props.theme.colors.buttons.yellow.border};
    box-shadow: ${(props) => props.theme.colors.buttons.yellow.boxShadow};
    border-radius: 6px;
    font-weight: 600;
    font-size: 12px;
    line-height: 14px;
    margin: 18px 0px 0px;

    :hover {
      background: ${(props) => props.theme.colors.buttons.yellow.background};
    }
  }
`;
