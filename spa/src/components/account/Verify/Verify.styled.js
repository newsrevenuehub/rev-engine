import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Verify = styled.div`
  background-color: ${(props) => props.theme.colors.purple};
  width: 100%;
`;

export const Logo = styled.img`
  width: 80%;
  max-width: 208px;
  margin: 30px 0px 0px 40px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeUp}) {
    position: absolute;
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 50%;
    max-width: 140px;
  }
`;

export const Content = styled.div`
  width: 100%;
  background-color: ${(props) => props.theme.colors.purple};
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

export const Box = styled.div`
  background: ${(props) => props.theme.colors.white};
  border: 0.5px solid ${(props) => props.theme.colors.greyLight};
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  padding: 30px 36px;
  margin: 140px 0px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 0px 0px;
  }
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
  color: ${(props) => props.theme.colors.purple};
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
  color: ${(props) => props.theme.colors.greyVeryDark};

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
  color: ${(props) => props.theme.colors.purple};
  margin: 20px 0px 10px 0px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: 16px;
  }
`;

export const Resendtext = styled.div`
  font-weight: 300;
  font-size: 13px;
  line-height: 138.19%;
  color: ${(props) => props.theme.colors.greyVeryDark};
`;

export const Button = styled(motion.button)`
  margin: 20px 0px 15px;
  padding: 16px 30px;
  cursor: pointer;
  width: 80%;
  max-width: 260px;
  text-transform: uppercase;
  text-align: center;
  background: ${(props) => props.theme.colors.buttons.yellow.background};
  border: ${(props) => props.theme.colors.buttons.yellow.border};
  box-shadow: ${(props) => props.theme.colors.buttons.yellow.boxShadow};
  border-radius: 6px;

  &:active {
    transform: translate(1px, 1px);
  }
`;

export const Help = styled.div`
  font-weight: 500;
  font-size: 13px;
  line-height: 138.19%;
  color: ${(props) => props.theme.colors.greyDark};

  span {
    font-weight: 800;
  }
`;
