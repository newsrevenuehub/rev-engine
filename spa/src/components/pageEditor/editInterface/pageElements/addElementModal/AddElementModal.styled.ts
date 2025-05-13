import { motion } from 'framer-motion';
import { ModalContent as BaseModalContent } from 'components/base';
import styled from 'styled-components';
import { Add } from '@material-ui/icons';

export const AddIcon = styled(Add)`
  color: ${({ theme }) => theme.basePalette.primary.engineBlue};
`;

export const AvailableElements = styled(motion.ul)`
  list-style: none;
  padding: 0;
`;

export const ModalContent = styled(BaseModalContent)`
  max-height: 80vh;
  overflow-y: auto;
`;

export const PageItemWrapper = styled.li`
  margin: 1rem 0;
  cursor: pointer;
`;

export const Prompt = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;
