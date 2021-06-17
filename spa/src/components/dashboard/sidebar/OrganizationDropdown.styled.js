import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';
import { motion } from 'framer-motion';

export const Wrapper = styled.div`
  position: relative;
`;

export const Button = styled.div`
  position: relative;
  padding: 0.5rem;
  cursor: pointer;
  z-index: 3;

  display: flex;
  flex-direction: row;
  align-items: center;

  span {
    margin-right: 2rem;
  }
`;

export const IconWrap = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const Chevron = styled(SvgIcon)`
  width: 10px;
  height: 10px;
`;

export const Dropdown = styled(motion.div)`
  position: absolute;
  left: 115%;
  bottom: 50%;
  transform: translateY(-50%);
  z-index: 2;
  background: ${(props) => props.theme.colors.white};
  box-shadow: ${(props) => props.theme.shadows[1]};
  border-radius: ${(props) => props.theme.radii[0]};
  min-width: 100%;
`;

export const DropdownList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const Item = styled.li`
  padding: 1rem 1.5rem;
  &:hover {
    background: ${(props) => props.theme.colors.hover};
  }
  cursor: pointer;
`;

export const LogoutItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  white-space: nowrap;
`;

export const LogoutIcon = styled(SvgIcon)`
  width: 10px;
  height: 10px;
  margin-left: 0.5rem;
`;

export const CloseOverlay = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
`;
