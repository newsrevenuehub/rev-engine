import { Button } from 'components/base';
import styled, { DefaultTheme } from 'styled-components';

export const Outer = styled.div`
  font-family: ${(props) => props.theme.systemFont};
  display: flex;
  flex-wrap: wrap;
  margin: 0px;
  display: flex;
  width: 100%;

  h1,
  p,
  span {
    font-family: ${(props) => props.theme.systemFont};
  }

  @media (${(props) => props.theme.breakpoints.mdUp}) {
    height: 100vh;
  }
`;

export const Left = styled.div<{ isCreateAccountPage?: boolean }>`
  position: relative;
  background: ${(props) =>
    props.isCreateAccountPage
      ? `linear-gradient(39.42deg, ${props.theme.colors.account.purple[1]} 47.23%, #25192bc9 105.55%);`
      : `linear-gradient(39.42deg, #6fd1ec 47.23%, #8af7e3 105.55%);`};
  flex: 35%;
  margin: 0px;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex: 100%;
    max-height: 240px;
  }

  @media (${(props) => props.theme.breakpoints.mdUp}) {
    overflow: hidden;
    min-height: 100vh;

    :after {
      background: ${(props) => (props.isCreateAccountPage ? '#302436' : 'rgba(255, 255, 255, 0.18)')};
      bottom: 0;
      content: '';
      display: block;
      height: 20%;
      width: 100%;
      left: 0;
      position: absolute;
      transform: skewY(-8.5deg);
      transform-origin: 100%;
    }
  }
`;

export const Right = styled.div`
  flex: 65%;
  margin: 0px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.white};

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex: 100%;
  }

  @media (${(props) => props.theme.breakpoints.mdUp}) {
    min-height: 100vh;
  }
`;

export const FormElements = styled.div<{ shorten?: boolean }>`
  width: 80%;
  max-width: ${(props) => (props.shorten ? '320px' : '437px')};
  text-align: left;

  ${(props) =>
    props.shorten &&
    `
    margin-bottom: 20vh;
  `}
`;

export const BottomBar = styled.div`
  position: absolute;
  width: 100%;
  bottom: 0px;
  right: 0px;
`;

export const BottomBarYellowSVG = styled.img`
  position: absolute;
  width: 100%;
  bottom: 0px;
  right: 0px;
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Heading = styled.h1<{ marginBottom?: number }>`
  font-weight: 700;
  font-size: ${(props) => props.theme.fontSizesUpdated.h1};
  margin-bottom: ${(props) => (props.marginBottom ? `${props.marginBottom}px` : '20px')};

  line-height: 47px;
  color: ${(props) => props.theme.colors.account.purple[1]};

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin-top: ${(props) => props.theme.fontSizesUpdated['2xl']};
  }
`;

export const Subheading = styled.div<{ fontSize?: keyof DefaultTheme['fontSizesUpdated']; shorten?: boolean }>`
  margin: ${(props) => (props.shorten ? '5px 0px 5px' : '5px 0px 25px')};

  font-weight: 300;
  font-size: ${(props) => props.theme.fontSizesUpdated[props.fontSize || 'md']};
  line-height: 138.19%;
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-style: normal;
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.lg};
    margin: 5px 0px 20px;
  }
`;

export const Submit = styled(Button)`
  && {
    width: 100%;
    padding-top: 15px;
    padding-bottom: 15px;
    border-radius: ${(props) => props.theme.buttons.yellow.borderRadius};
    margin: 7px 0px 10px;
  }
`;

export const Message = styled.div<{ isSuccess?: boolean; info?: string }>`
  background: ${(props) => (props.isSuccess ? props.theme.colors.status.done : props.theme.colors.error.bg)};
  border-radius: ${(props) => props.theme.muiBorderRadius.sm};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: 24px;
  color: ${(props) => props.theme.colors.muiGrey[600]};
  padding: 0px 4px;
  margin-bottom: 6px;

  ${(props) =>
    props.info === 'true' &&
    `
    background: unset;
    color: ${props.theme.colors.muiGrey[800]};
    padding: 0;
  `}
`;

export const MessageSpacer = styled.div`
  height: ${(props) => props.theme.fontSizesUpdated.lg};
`;

export const PasswordLabel = styled.label<{ hasError?: boolean }>`
  display: flex;
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.muiGrey[900])};
  margin-top: 5px;

  a {
    width: 100%;
    text-align: right;
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    color: ${(props) => props.theme.colors.account.blueLink};
  }
`;

export const InputOuter = styled.div<{ hasError?: boolean }>`
  border: 1.5px solid;
  border-color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.muiGrey[300])};
  border-radius: ${(props) => props.theme.muiBorderRadius.md};
  display: flex;
  margin: 5px 0px;
  padding: 8px 6px 8px 12px;
  position: relative;
  height: 37px;

  input {
    width: 97%;
    background-color: transparent;
    border: 0px solid;
    -webkit-appearance: none;
    outline: none;
  }

  &:focus-within {
    border: 1.5px solid ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.primary)};
  }
`;

export const Visibility = styled.img<{ visible: string }>`
  width: 24px;
  height: 22px;
  cursor: pointer;
  ${(props) =>
    props.visible === 'true' &&
    `
      height: 16px;
      margin: 3px 0;
  `}
`;

export const InputLabel = styled.label<{ hasError?: boolean }>`
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.muiGrey[900])};
  margin-top: 5px;
`;

export const Instructions = styled.div`
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  padding: 0px 0px 6px 0px;
`;

export const AcceptTermsText = styled.p`
  margin-left: 14px;
  line-height: 16px;
`;

export const NavLink = styled.p<{ alignLeft?: boolean }>`
  margin: 15px 0px 12px;
  width: 100%;
  text-align: ${(props) => (props.alignLeft ? 'left' : 'center')};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.muiGrey[900]};

  a,
  a:hover {
    color: ${(props) => props.theme.colors.account.blueLink};
    text-decoration: underline;
    font-weight: 600;
  }
`;

export const Disclaimer = styled.div`
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: 13px;
  color: ${(props) => props.theme.colors.muiGrey[600]};
  margin: 10px 0px 12px;
`;

export const AcceptTermsWrapper = styled.div`
  display: flex;
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  line-height: 15px;
  color: ${(props) => props.theme.colors.muiGrey[900]};
  margin-top: 35px;
  margin-bottom: 30px;

  a,
  a:hover {
    color: ${(props) => props.theme.colors.account.blueLink};
    text-decoration: underline;
  }

  && {
    span > svg {
      height: 24px;
      width: 24px;
    }
  }
`;
