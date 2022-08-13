import { Button as MuiButton } from '@material-ui/core';
import styled from 'styled-components';
//import lighten from 'styles/utils/lighten';

export const ConnectStripeToast = styled.div`
  position: absolute;
  top: 70px;
  right: 10px;
  font-family: ${(props) => props.theme.systemFont};
  border: 0.5px solid #f1f1f1;
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  width: 90%;
  max-width: 300px;
  padding: 11px 17px 17px;
  z-index: 100;
  background-color: #fff;
`;

export const ConnectStripeToastCollapsed = styled.div`
  position: absolute;
  top: 70px;
  right: 10px;
  background: #ffffff;
  border: 0.5px solid #f1f1f1;
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
  width: 60px;
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
  cursor: pointer;
  svg {
    color: #8c8c8c;
  }
  :hover {
    background-color: #c4c4c4;
  }
`;

export const Heading = styled.div`
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  font-weight: 600;
  color: #25192b;
  padding-bottom: 9px;
`;

export const Description = styled.p`
  font-size: 12px;
  line-height: 15px;
  color: #323232;
  margin-bottom: 0px;
`;

export const Button = styled(MuiButton)`
  && {
    width: 100%;
    height: 36px;
    background: #f5ff75;
    border: 0.5px solid #e6ee84;
    box-shadow: 0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    font-weight: 600;
    font-size: 12px;
    line-height: 14px;
    margin: 18px 0px 0px;

    :hover {
      background-color: #f5ff75;
    }
  }
`;
