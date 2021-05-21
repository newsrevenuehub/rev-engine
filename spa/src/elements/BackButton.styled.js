import styled from 'styled-components';
import { motion } from 'framer-motion';

import SvgIcon from 'assets/icons/SvgIcon';

export const BackButton = styled(motion.button)`
  background: transparent;
  border: none;
  cursor: pointer;
`;

export const BackIcon = styled(SvgIcon)`
  height: 20px;
  width: 20px;
`;
