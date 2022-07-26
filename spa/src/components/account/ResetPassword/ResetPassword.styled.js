import styled from 'styled-components';
import { motion } from 'framer-motion';

export const ResetPassword = styled.div`
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
  margin-bottom: -8px;
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Heading = styled.div`
  font-weight: 700;
  font-size: 28px;
  line-height: 138.19%;
  color: #25192b;

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
  font-size: 14px;
  line-height: 138.19%;
  color: #282828;
  font-style: normal;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: 16px;
    margin: 5px 0px 20px;
  }
`;

export const SignUpToggle = styled.div`
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
