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

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: row;
  }
`;

export const NavItem = styled(NavLink)`
  text-decoration: none;
  color: ${(props) => (props.disabled ? props.theme.colors.disabled : props.theme.colors.black)};
  padding: 1rem;

  cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};

  &.active {
    background: ${(props) => props.theme.colors.paneBackground};
  }
`;
