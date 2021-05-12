import styled from 'styled-components';
import { motion } from 'framer-motion';

export const DashboardSectionGroup = styled(motion.ul)`
  padding: 0;
  margin: 0 auto;
  width: 100%;
  max-width: ${(p) => p.theme.maxWidths.lg};
  list-style: none;
  & > :not(:last-child) {
    margin-bottom: 4rem;
  }
`;
