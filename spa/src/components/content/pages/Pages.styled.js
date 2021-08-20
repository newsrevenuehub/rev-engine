import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { motion } from 'framer-motion';

export const Pages = styled(motion.div)``;

export const RevProgramList = styled(motion.ul)``;

export const RevenueProgramSection = styled(motion.div)``;

export const AccordionHeading = styled(motion.div)`
  padding-bottom: 0.5rem;
  padding-right: 2rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.grey[1]};
  cursor: pointer;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const RevProgramName = styled.p`
  margin: 0;
  padding: 0;
  font-size: ${(props) => props.theme.fontSizes[2]};
`;

export const Chevron = styled(FontAwesomeIcon)`
  transition: transform 0.2s ease-in-out;
  transform: rotate(${(props) => (props.isOpen ? '0deg' : '180deg')});
`;

export const PagesList = styled(motion.ul)`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding: 1rem;
  margin: 0;
`;

export const accordionAnimation = {
  initial: { y: -10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 }
};
