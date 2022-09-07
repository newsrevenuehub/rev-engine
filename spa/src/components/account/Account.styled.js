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
    props.bgColor && props.bgColor === 'purple'
      ? props.theme.colors.account.purple[1]
      : `linear-gradient(39.42deg, #6fd1ec 47.23%, #8af7e3 105.55%);`};
  flex: 35%;
  margin: 0px;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (${(props) => props.theme.breakpoints.mdDown}) {
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

  @media (${(props) => props.theme.breakpoints.mdDown}) {
    flex: 100%;
  }

  @media (${(props) => props.theme.breakpoints.mdUp}) {
    min-height: 100vh;
  }
`;

export const FormElements = styled.div`
  width: 80%;
  max-width: 420px;
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
  @media (${(props) => props.theme.breakpoints.mdDown}) {
    display: none;
  }
`;

export const Heading = styled.div`
  font-weight: 400;
  font-size: 30px;
  line-height: 138.19%;
  color: ${(props) => props.theme.colors.account.purple[2]};

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: 24px;
  }

  @media (${(props) => props.theme.breakpoints.mdDown}) {
    margin-top: 72px;
  }
`;

export const Submit = styled(motion.button)`
  cursor: pointer;
  width: 100%;
  text-transform: uppercase;
  text-align: center;
  padding: 9px 0px;
  background: ${(props) => props.theme.colors.buttons.yellow.background};
  border: ${(props) => props.theme.colors.buttons.yellow.border};
  box-shadow: ${(props) => props.theme.colors.buttons.yellow.boxShadow};
  border-radius: 6px;
  margin: 7px 0px 10px;
  &:active {
    transform: translate(1px, 1px);
  }
`;

export const Message = styled.div`
  background: ${(props) => (props.isSuccess ? props.theme.colors.status.done : props.theme.colors.error.bg)};
  border-radius: 2px;
  font-weight: 400;
  font-size: 11px;
  line-height: 19px;
  color: ${(props) => props.theme.colors.grey[3]};
  padding: 0px 9px;
`;

export const MessageSpacer = styled.div`
  height: 19px;
`;

export const SignInLink = styled.div`
  margin: 15px 0px 12px;
  width: 100%;
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => props.theme.colors.grey[4]};

  a,
  a:hover {
    color: ${(props) => props.theme.colors.account.blueLink};
    text-decoration: underline;
  }
`;

export const PasswordLabel = styled.div`
  display: flex;
  font-weight: 600;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.grey[4])};
  margin-top: 5px;

  a {
    width: 100%;
    text-align: right;
  }
`;

export const InputOuter = styled.div`
  border: 1.5px solid;
  border-color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.grey[1])};
  border-radius: 4px;
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
  width: 18px;
  margin-top: 3.6px;
  cursor: pointer;
`;

export const InputLabel = styled.div`
  font-weight: 600;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.grey[4])};
  margin-top: 5px;
`;

export const Instructions = styled.div`
  font-size: 11px;
  line-height: 13px;
  color: ${(props) => props.theme.colors.grey[3]};
  padding: 0px 0px 6px 0px;
`;
