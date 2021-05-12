import { Children } from 'react';
import * as S from './DashboardSectionGroup.styled';

import { motion } from 'framer-motion';

const staggerChildren = 0.1;
export const LIST_VARIANTS = {
  enter: { transition: { staggerChildren } },
  exit: { transition: { staggerChildren } }
};

const duration = 0.5;
const ease = [0.43, 0.13, 0.23, 0.96];
export const LIST_ITEM_VARIANTS = {
  initial: { x: 50, opacity: 0 },
  enter: { x: 0, opacity: 1, transition: { duration, ease } },
  exit: {
    x: -50,
    opacity: 0,
    transition: { duration, ease }
  }
};

function DashboardSectionGroup({ children }) {
  return (
    <S.DashboardSectionGroup initial="initial" animate="enter" exit="exit" variants={LIST_VARIANTS}>
      {Children.map(children, (child) => {
        return <motion.li variants={LIST_ITEM_VARIANTS}>{child}</motion.li>;
      })}
    </S.DashboardSectionGroup>
  );
}

export default DashboardSectionGroup;
