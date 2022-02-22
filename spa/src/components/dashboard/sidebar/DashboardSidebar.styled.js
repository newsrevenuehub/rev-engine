import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import SvgIcon from 'assets/icons/SvgIcon';
import { motion } from 'framer-motion';

export const DashboardSidebar = styled.aside`
  width: 220px;
  height: 100%;
  padding-top: 2rem;
  background: ${(props) => props.theme.colors.paneBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding-top: 0;
    flex-direction: row;
    height: 80px;
    width: 100%;
  }
`;

export const NavList = styled.ul`
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  margin: 0;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: row;
    align-items: flex-end;
    padding: 0;
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

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 0;
    padding: 1rem;
    border-bottom: 5px solid transparent;
    &.active {
      border-left: none;
      border-bottom: 5px solid ${(props) => props.theme.colors.primary};
    }
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

export const Pickers = styled.div``;

export const SelectWrapper = styled.div`
  padding: 1rem;
`;
