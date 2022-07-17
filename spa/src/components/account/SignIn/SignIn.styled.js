import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Login = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const LoginCard = styled.section`
  padding: 4rem;
  background: ${(props) => props.theme.colors.white};
  max-width: 450px;
  width: 100%;
  box-shadow: ${(props) => props.theme.shadows[1]};
  border-radius: ${(props) => props.theme.radii[1]};
`;

export const Message = styled.p`
  padding: 1rem 0;
`;

export const LoginForm = styled.form``;

export const InputWrapper = styled.div`
  &:not(:last-of-type) {
    margin-bottom: 2rem;
  }
`;

export const LoginButtons = styled.div`
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

export const LoginButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 1rem;
`;

export const ForgotPasswordLink = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
`;

// below this
export const SignIn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

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
  background: linear-gradient(39.42deg, #f5ff75 47.23%, #f1f3da 105.55%);
  flex: 35%;
  margin: 0px;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex: 100%;
  }
`;

export const Right = styled.div`
  flex: 65%;
  margin: 0px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: #fff;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex: 100%;
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

export const BottomBarImg = styled.img`
  width: 100%;
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Heading = styled.div`
  font-weight: 700;
  font-size: 28px;
  line-height: 138.19%;
  color: #25192b;
  margin-bottom: 15px;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: 20px;
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
  color: #282828;
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
  color: #323232;
  margin-top:6px;

  a, a:hover {
    color: #0052CC;
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
  color: #3c3c3c;
  margin: 15px 0px 12px;
`;

export const SignInLink = styled.div`
  margin: 15px 0px 12px;
  width: 100%;
  text-align: center;
  font-weight: 400;
  font-size: 13px;
  line-height: 16px;
  color: #323232;

  a,
  a:hover {
    color: #0052cc;
    text-decoration: underline;
  }
`;

export const PasswordLabel = styled.div`
  display: flex;
  font-weight: 600;
  font-size: 13px;
  line-height: 16px;
  color: #323232;
  margin-top: 5px;

  a {
    width: 100%;
    text-align: right;
  }
`;

export const Submit = styled(motion.button)`
  cursor: pointer;
  width: 100%;
  text-transform: uppercase;
  text-align: center;
  padding: 9px 0px;
  background: #f5ff75;
  border: 0.5px solid #e6ee84;
  box-shadow: 0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2);
  border-radius: 6px;

  &:active {
    transform: translate(1px, 1px);
  }
`;
