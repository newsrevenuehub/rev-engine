import { Button as BaseButton } from 'components/base';
import styled from 'styled-components';

export const ConnectStripeToastWrapper = styled.div`
  position: absolute;
  top: 58px;
  right: 10px;
  font-family: ${(props) => props.theme.systemFont};
  font-size: 16px;
  border: 0.5px solid ${(props) => props.theme.colors.muiGrey[100]};
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.2);
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
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
  border: 0.5px solid ${(props) => props.theme.colors.muiGrey[100]};
  box-shadow:
    0px 0.3px 0.5px rgba(0, 0, 0, 0.1),
    0px 2px 4px rgba(0, 0, 0, 0.2);
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
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

export const StripeLogoWrapper = styled.img`
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
  height: ${(props) => props.theme.fontSizesUpdated['lgx']};
  cursor: pointer;
  svg {
    color: ${(props) => props.theme.colors.muiGrey[600]};
    height: ${(props) => props.theme.fontSizesUpdated['lgx']};
    width: ${(props) => props.theme.fontSizesUpdated['lgx']};
  }
  :hover {
    background-color: ${(props) => props.theme.colors.muiGrey[100]};
  }
`;

export const Heading = styled.div`
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  font-weight: 600;
  color: ${(props) => props.theme.colors.account.purple[1]};
  margin-bottom: 12px;
`;

export const Description = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  line-height: 19px;
  font-weight: 400;
  margin-bottom: 0px;
`;

export const Button = styled(BaseButton)`
  && {
    text-transform: uppercase;
    width: 100%;
    height: 40px;
    margin-top: 20px;
  }
`;
