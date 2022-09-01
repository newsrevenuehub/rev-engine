import styled from 'styled-components';
import { motion } from 'framer-motion';
import { makeStyles } from '@material-ui/core/styles';

export default makeStyles((theme) => ({
  searchbar: {
    [theme.breakpoints.up('md')]: {
      maxWidth: 228
    }
  }
}));

export const Hero = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;

export const Content = styled.div`
  display: flex;
  justify-content: start;
  align-items: start;
  gap: 2rem;
  flex-wrap: wrap;
`;

// ButtonSection, PlusButton & accordionAnimation are being used elsewhere.
// TODO: remove when not used anymore
export const ButtonSection = styled(motion.div)`
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
`;

export const PlusButton = styled(motion.div)``;

export const accordionAnimation = {
  initial: { y: -10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 }
};
