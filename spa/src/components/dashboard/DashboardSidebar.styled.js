import styled from 'styled-components';
import { NavLink } from 'react-router-dom';

export const DashboardSidebar = styled.aside`
  width: 120px;
  padding-top: 2rem;
`;

export const NavList = styled.ul`
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  margin: 0;

  @media (${(p) => p.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: row;
  }
`;

export const NavItem = styled(NavLink)`
  text-decoration: none;
  color: ${(p) => (p.disabled ? p.theme.colors.disabled : p.theme.colors.black)};
  padding: 1rem;

  cursor: ${(p) => (p.disabled ? 'default' : 'pointer')};

  &.active {
    background: ${(p) => p.theme.colors.paneBackground};
  }
`;
