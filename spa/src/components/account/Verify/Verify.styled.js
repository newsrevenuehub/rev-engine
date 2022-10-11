import styled from 'styled-components';

import { Button as BaseButton } from 'components/base';

export const Verify = styled.div`
  background-color: ${(props) => props.theme.colors.account.purple[1]};
  width: 100%;
`;

export const Logo = styled.img`
  width: 80%;
  max-width: 208px;
  margin: 30px 0px 0px 40px;

  @media (${(props) => props.theme.breakpoints.mdUp}) {
    position: absolute;
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 50%;
    max-width: 140px;
  }
`;

export const Content = styled.div`
  width: 100%;
  background-color: ${(props) => props.theme.colors.account.purple[1]};
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  h1,
  p,
  span {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const Box = styled.div`
  background: ${(props) => props.theme.colors.white};
  border: 0.5px solid ${(props) => props.theme.colors.grey[1]};
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.2);
  border-radius: ${(props) => props.theme.muiBorderRadius.xl};
  width: 90%;
  max-width: 712px;
  padding: 30px 58px;
  margin: 140px 0px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 0px 0px;
  }
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    padding: 30px;
  }
`;

export const Icon = styled.img`
  width: 66px;
  margin-right: 10px;
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 36px;
  }
`;

export const Heading = styled.h1`
  font-weight: 700;
  font-size: ${(props) => props.theme.fontSizesUpdated.lg3x};
  color: ${(props) => props.theme.colors.account.purple[1]};
  margin: 20px 0px 10px 0px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  }
`;

export const Subheading = styled.p`
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.colors.muiGrey[900]};

  span {
    font-weight: 600;
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.md};
  }
`;

export const Drm = styled.p`
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated[20]};
  color: ${(props) => props.theme.colors.account.purple[1]};
  margin: 28px 0px 10px 0px;
`;

export const Resendtext = styled.p`
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  margin: 0;
`;

export const Button = styled(BaseButton)`
  && {
    margin: 20px 0px 24px;
    padding: 16px 30px;
    width: 270px;
  }
`;

export const Help = styled.p`
  font-weight: 500;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.colors.muiGrey[600]};
`;

export const Message = styled.p`
  margin-top: 10px;
  background: ${(props) => (props.isSuccess ? props.theme.colors.status.done : props.theme.colors.error.bg)};
  border-radius: ${(props) => props.theme.muiBorderRadius.sm};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  line-height: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  padding: 0px 9px;
`;
