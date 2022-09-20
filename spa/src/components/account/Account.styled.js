import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Outer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0px;
  display: flex;
  width: 100%;

  @media (${(props) => props.theme.breakpoints.mdUp}) {
    height: 100vh;
  }
`;

export const Left = styled.div`
  background: ${(props) =>
    props.isCreateAccountPage
      ? props.theme.colors.account.purple[1]
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
    min-height: 100vh;
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

export const FormElements = styled.div`
  width: 80%;
  max-width: ${(props) => (props.shorten ? '310px' : '420px')};
  text-align: left;
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

export const Heading = styled.div`
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.h1};
  margin-bottom: 20px;

  line-height: 138.19%;
  color: ${(props) => props.theme.colors.account.purple[2]};

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin-top: ${(props) => props.theme.fontSizesUpdated.xl};
  }
`;

export const Subheading = styled.div`
  margin: ${(props) => (props.shorten ? '5px 0px 5px' : '5px 0px 25px')};

  font-weight: 300;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  line-height: 138.19%;
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-style: normal;
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.lg};
    margin: 5px 0px 20px;
  }
`;

export const Submit = styled(motion.button)`
  cursor: pointer;
  width: 100%;
  text-transform: uppercase;
  text-align: center;
  padding: 9px 0px;
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  background: ${(props) => props.theme.buttons.yellow.background};
  color: ${(props) => props.theme.buttons.yellow.color};
  border: ${(props) => props.theme.buttons.yellow.border};
  box-shadow: ${(props) => props.theme.buttons.yellow.boxShadow};
  border-radius: ${(props) => props.theme.buttons.yellow.borderRadius};
  margin: 7px 0px 10px;
  &:active {
    transform: translate(1px, 1px);
    color: ${(props) => props.theme.buttons.yellow.color};
  }
  &:disabled {
    color: ${(props) => props.theme.colors.muiGrey[600]};
    transform: translate(1px, 1px);
  }
`;

export const Message = styled.div`
  background: ${(props) => (props.isSuccess ? props.theme.colors.status.done : props.theme.colors.error.bg)};
  border-radius: ${(props) => props.theme.muiBorderRadius.sm};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  padding: 0px 9px;
`;

export const MessageSpacer = styled.div`
  height: ${(props) => props.theme.fontSizesUpdated.lg};
`;

export const PasswordLabel = styled.div`
  display: flex;
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.muiGrey[900])};
  margin-top: 5px;

  a {
    width: 100%;
    text-align: right;
  }
`;

export const InputOuter = styled.div`
  border: 1.5px solid;
  border-color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.muiGrey[300])};
  border-radius: ${(props) => props.theme.muiBorderRadius.md};
  display: flex;
  margin: 5px 0px;
  padding: 8px 6px 8px 12px;

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

export const Visibility = styled.img`
  height: 11px;
  width: ${(props) => props.theme.fontSizesUpdated.lg};
  margin-top: 3.6px;
  cursor: pointer;
`;

export const InputLabel = styled.label`
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
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

export const NavLink = styled.div`
  margin: 15px 0px 12px;
  width: 100%;
  text-align: ${(props) => (props.alignLeft ? 'left' : 'center')};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.muiGrey[900]};

  a,
  a:hover {
    color: ${(props) => props.theme.colors.account.blueLink};
    text-decoration: underline;
  }
`;

export const Disclaimer = styled.div`
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: 13px;
  color: ${(props) => props.theme.colors.muiGrey[600]};
  margin: 10px 0px 12px;
`;

export const AcceptTerms = styled.div`
  display: flex;
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  line-height: 15px;
  color: ${(props) => props.theme.colors.muiGrey[900]};
  margin-top: 6px;
  a,
  a:hover {
    color: ${(props) => props.theme.colors.account.blueLink};
    text-decoration: underline;
  }
`;
