import { Button as MuiButton, Modal as MuiModal } from '@material-ui/core';
import styled from 'styled-components';
//import lighten from 'styles/utils/lighten';

export const ConnectStripeModal = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  font-family: ${(props) => props.theme.systemFont};
  background: #ffffff;
  border: 0.5px solid #c4c4c4;
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 30px 65px;
  width: 90%;
  max-width: 610px;
`;

export const Modal = styled(MuiModal)`
  display: flex;
  align-items: center;
  justify-content: center;

  *,
  ::after,
  ::before {
    outline: none;
  }
  a,
  a span,
  a:hover,
  a:hover span {
    color: #0052cc;
    text-decoration: underline;
  }
`;

export const h2 = styled.h2`
  margin-top: 0px;
  font-weight: 700;
  font-size: 24px;
  line-height: 28px;
  color: #25192b;
`;

export const Description = styled.div`
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 300;
  font-size: 16px;
  line-height: 19px;
  color: #282828;
  margin-bottom: 0px;
`;

export const Bold = styled.div`
  font-weight: 600;
  margin: 17px 0px 8px;
`;

export const Button = styled(MuiButton)`
  && {
    width: 100%;
    height: 48px;
    background: #f5ff75;
    border: 0.5px solid #e6ee84;
    box-shadow: 0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    font-weight: 600;
    font-size: 14px;
    line-height: 16px;
    margin: 25px 0px 28px;

    :hover {
      background-color: #f5ff75;
    }
  }
`;

export const StripeFAQ = styled.a`
  font-size: 16px;
  line-height: 19px;
`;

export const Anchor = styled.a`
  cursor: pointer;
  width: 100%;
  text-align: center;
  span,
  svg {
    vertical-align: middle;
    display: inline-block;
  }
  span {
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    text-align: center;
  }
  svg {
    font-size: 18px;
  }
`;

export const StripeLogo = styled.img`
  width: 68px;
  text-align: left;
  margin-bottom: 24px;
`;

export const BottomNav = styled.img`
  width: 42px;
  margin: 34px auto 0px;
`;
