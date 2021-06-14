import { motion } from 'framer-motion';
import styled from 'styled-components';

export const AddElementModal = styled.div`
  height: 85vh;
  width: 800px;
  padding: 1rem;
  background: ${(props) => props.theme.colors.paneBackground};
  border-radius: ${(props) => props.theme.radii[0]};
`;

export const ModalContent = styled(motion.div)``;

export const ModalHeading = styled(motion.h3)``;

export const AvailableElements = styled(motion.ul)`
  list-style: none;
  padding: 1rem;
`;

export const PageItemWrapper = styled.li`
  margin: 1rem 0;
  cursor: pointer;
`;
