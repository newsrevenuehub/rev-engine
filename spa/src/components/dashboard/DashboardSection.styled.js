import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { motion } from 'framer-motion';

export const DashboardSection = styled(motion.section)`
  border-radius: ${(props) => props.theme.radii[0]};
  box-shadow: ${(props) => props.theme.shadows[0]};
  background: ${(props) => props.theme.colors.paneBackground};
`;

export const SectionHeading = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${(props) => props.theme.colors.primary};
  border-top-right-radius: ${(props) => props.theme.radii[0]};
  border-top-left-radius: ${(props) => props.theme.radii[0]};
  height: 50px;
  position: relative;

  cursor: ${(props) => (props.collapsible ? 'pointer' : 'default')};

  h2 {
    margin: 0;
    font-size: ${(props) => props.theme.fontSizes[1]};
    color: ${(props) => props.theme.colors.white};
  }
`;

export const Chevron = styled(FontAwesomeIcon)`
  position: absolute;
  right: 20px;
  color: ${(props) => props.theme.colors.white};
  transition: transform 0.2s ease-in-out;
  transform: rotate(${(props) => (props.collapsed ? '180deg' : '0deg')});
`;

export const SectionContent = styled(motion.div)`
  padding: 2rem;
`;
