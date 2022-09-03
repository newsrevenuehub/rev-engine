import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Outer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0px;
  display: flex;
  width: 100%;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeUp}) {
    height: 100vh;
  }
`;

export const Left = styled.div`
  background: ${(props) =>
    props.bgColor && props.bgColor === 'purple'
      ? props.theme.colors.purple
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

  @media (${(props) => props.theme.breakpoints.tabletLandscapeUp}) {
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

  @media (${(props) => props.theme.breakpoints.tabletLandscapeUp}) {
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
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Heading = styled.div`
  font-weight: 700;
  font-size: 34px;
  line-height: 138.19%;
  color: ${(props) => props.theme.colors.purpleDark};

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: 24px;
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin-top: 72px;
  }
`;

export const Subheading = styled.div`
  margin: 5px 0px 25px;
  font-weight: 300;
  font-size: 24px;
  line-height: 138.19%;
  color: ${(props) => props.theme.colors.greyVeryDark};
  font-style: normal;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: 16px;
    margin: 5px 0px 20px;
  }
`;

export const AcceptTerms = styled.div`
  display:flex;
  font-size:
  font-weight: 400;
  font-size: 12px;
  line-height: 15px;
  color: ${(props) => props.theme.colors.greyDark};
  margin-top:6px;

  a, a:hover {
    color: ${(props) => props.theme.colors.blueLink};
    text-decoration: underline;
  }

   @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: 11px;
  }

`;

export const Disclaimer = styled.div`
  font-weight: 400;
  font-size: 11px;
  line-height: 13px;
  color: ${(props) => props.theme.colors.greyMedium};
  margin: 15px 0px 12px;
`;

export const SignInToggle = styled.div`
  margin: 15px 0px 12px;
  width: 100%;
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => props.theme.colors.greyDark};

  a,
  a:hover {
    color: ${(props) => props.theme.colors.blueLink};
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
  margin-top: 7px;
  &:active {
    transform: translate(1px, 1px);
  }
`;

export const ErrorMessage = styled.div`
  background: rgba(200, 32, 63, 0.16);
  border-radius: 2px;
  font-weight: 400;
  font-size: 11px;
  line-height: 13px;
  color: ${(props) => props.theme.colors.greyMedium};
  padding: 4px 9px;
`;

export const ErrorSpacer = styled.div`
  height: 17px;
  padding: 4px 9px;
`;

export const SignInLink = styled.div`
  margin: 15px 0px 12px;
  width: 100%;
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => props.theme.colors.greyDark};

  a,
  a:hover {
    color: ${(props) => props.theme.colors.blueLink};
    text-decoration: underline;
  }
`;

export const PasswordLabel = styled.div`
  display: flex;
  font-weight: 600;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => props.theme.colors.greyDark};
  margin-top: 5px;

  a {
    width: 100%;
    text-align: right;
  }
`;

export const SignUpToggle = styled.div`
  margin: 15px 0px 12px;
  width: 100%;
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  line-height: 16px;
  color: ${(props) => props.theme.colors.greyDark};

  a,
  a:hover {
    color: ${(props) => props.theme.colors.blueLink};
    text-decoration: underline;
  }
`;

export const InputOuter = styled.div`
  border: 1.5px solid;
  border-color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.greyLight)};
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
  color: ${(props) => (props.hasError ? props.theme.colors.error.primary : props.theme.colors.greyDark)};
  margin-top: 5px;
`;

export const InputErrorMessage = styled.div`
  background: rgba(200, 32, 63, 0.16);
  border-radius: 2px;
  font-weight: 400;
  font-size: 11px;
  line-height: 13px;
  color: ${(props) => props.theme.colors.greyMedium};
  padding: 4px 9px;
`;

export const Instructions = styled.div`
  font-size: 11px;
  line-height: 13px;
  color: ${(props) => props.theme.colors.greyMedium};
  padding: 0px 0px 6px 0px;
`;
