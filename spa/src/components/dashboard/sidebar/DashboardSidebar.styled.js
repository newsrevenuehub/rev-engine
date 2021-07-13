import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import SvgIcon from 'assets/icons/SvgIcon';
import { motion } from 'framer-motion';

export const DashboardSidebar = styled.aside`
  width: 180px;
  height: 100%;
  padding-top: 2rem;
  background: ${(props) => props.theme.colors.paneBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;
`;

export const NavList = styled.ul`
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  margin: 0;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: row;
  }
`;

export const NavItem = styled(NavLink)`
  text-decoration: none;
  color: ${(props) => (props.disabled ? props.theme.colors.disabled : props.theme.colors.black)};

  margin: 1rem 0;
  padding: 1rem 2rem;

  cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};

  &.active {
    border-left: 5px solid ${(props) => props.theme.colors.primary};
  }
`;

export const OtherContent = styled.div`
  margin: 1rem 0;
  padding: 1rem 2rem;
`;

export const Logout = styled(motion.div)`
  display: flex;
  flex-direction: row;
  align-items: center;
  white-space: nowrap;
  cursor: pointer;
`;

export const LogoutIcon = styled(SvgIcon)`
  width: 10px;
  height: 10px;
  margin-right: 0.75rem;
  transform: rotate(180deg);
`;
