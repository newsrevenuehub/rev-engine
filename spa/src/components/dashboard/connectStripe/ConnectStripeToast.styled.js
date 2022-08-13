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

export const StripeLogo = styled.img`
  width: 54px;
  text-align: left;
  margin-bottom: 8px;
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
