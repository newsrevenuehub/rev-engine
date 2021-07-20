import styled from 'styled-components';
import { motion } from 'framer-motion';

export const DashboardSection = styled(motion.section)`
  border-radius: ${(props) => props.theme.radii[0]};
  box-shadow: ${(props) => props.theme.shadows[0]};
  background: ${(props) => props.theme.colors.paneBackground};
  min-height: 200px;
`;

export const SectionHeading = styled(motion.h2)`
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: ${(props) => props.theme.fontSizes[1]};
  background: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.white};
  border-top-right-radius: ${(props) => props.theme.radii[0]};
  border-top-left-radius: ${(props) => props.theme.radii[0]};
  height: 50px;
`;

export const SectionContent = styled(motion.div)`
  padding: 2rem;
`;
