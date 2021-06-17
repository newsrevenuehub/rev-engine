import styled from 'styled-components';
import { motion } from 'framer-motion';

export const EditInterface = styled(motion.aside)`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  height: 100%;
  background: ${(props) => props.theme.colors.paneBackground};
  box-shadow: ${(props) => props.theme.shadows[1]};
  width: 500px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
`;
