import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Verify = styled.div`
  width: 100%;
  background-color: #302436;
  width: 100%;
`;

export const Logo = styled.img`
  position: absolute;
  width: 80%;
  max-width: 208px;
  margin: 30px 0px 0px 40px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 50%;
    max-width: 140px;
  }
`;

export const Content = styled.div`
  width: 100%;
  background-color: #302436;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeUp}) {
  }
`;

export const Box = styled.div`
  background: #ffffff;
  border: 0.5px solid #c4c4c4;
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  padding: 30px 36px;
`;

export const Icon = styled.img`
  width: 48px;
  margin-right: 10px;
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 36px;
  }
`;

export const Heading = styled.div`
  font-weight: 700;
  font-size: 30px;
  line-height: 138.19%;
  color: #25192b;
  margin: 20px 0px 10px 0px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: 24px;
  }
`;

export const Subheading = styled.div`
  font-style: normal;
  font-weight: 300;
  font-size: 18px;
  line-height: 138.19%;
  color: #282828;

  span {
    font-weight: 800;
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: 16px;
  }
`;

export const Drm = styled.div`
  font-weight: 400;
  font-size: 18px;
  line-height: 138.19%;
  color: #25192b;
  margin: 20px 0px 10px 0px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: 16px;
  }
`;

export const Resendtext = styled.div`
  font-weight: 300;
  font-size: 13px;
  line-height: 138.19%;
  color: #282828;
`;

export const Button = styled(motion.button)`
  margin: 20px 0px 15px;
  padding: 16px 30px;
  cursor: pointer;
  width: 80%;
  max-width: 260px;
  text-transform: uppercase;
  text-align: center;
  background: #f5ff75;
  border: 0.5px solid #e6ee84;
  box-shadow: 0px 0.3px 0.5px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.2);
  border-radius: 6px;

  &:active {
    transform: translate(1px, 1px);
  }
`;

export const Help = styled.div`
  font-weight: 500;
  font-size: 13px;
  line-height: 138.19%;
  color: #707070;

  span {
    font-weight: 800;
  }
`;
