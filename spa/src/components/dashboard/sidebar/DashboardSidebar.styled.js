import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import SvgIcon from 'assets/icons/SvgIcon';
import { motion } from 'framer-motion';

export const DashboardSidebar = styled.aside`
  width: 260px;
  height: 100%;
  padding: 2rem 0.5rem;
  background: ${(props) => props.theme.colors.sidebarBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 66px;
    height: 100%;
    padding: 2rem 0px 2rem;
    background: ${(props) => props.theme.colors.sidebarBackground};
    box-shadow: ${(props) => props.theme.shadows[0]};
  }
`;

export const SideBarText = styled.span`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const NavList = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  margin: 0;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 0 0;
  }
`;

export const NavItemLabel = styled.div`
  text-decoration: none;
  color: ${(props) => props.theme.colors.white};

  line-height: 1.25rem;
  padding: 7px 18px 0px;
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
  font-family: ${(props) => props.theme.systemFont};

  vertical-align: middle;
  display: inline-block;

  svg {
    display: inline-flex;
    align-self: center;
    top: 0.15em;
    width: 16px;
    height: 16px;
    position: relative;
    filter: brightness(0) saturate(100%) invert(100%) sepia(3%) saturate(520%) hue-rotate(264deg) brightness(115%)
      contrast(100%);
    transform: rotate(0deg);
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 10px 3px;
  }
`;

export const NavItem = styled(NavLink)`
  text-decoration: none;
  color: ${(props) => (props.disabled ? props.theme.colors.disabled : props.theme.colors.white)};

  margin-bottom: 5px;
  line-height: 1.25rem;
  padding: 7px 18px;
  font-size: 16px;
  font-weight: 400;
  line-height: 19px;
  font-family: ${(props) => props.theme.systemFont};

  cursor: ${(props) => (props.disabled ? 'default' : 'pointer')};
  vertical-align: middle;
  display: inline-block;

  svg {
    display: inline-flex;
    align-self: center;
    top: 0.15em;
    width: 16px;
    height: 16px;
    position: relative;
    filter: brightness(0) saturate(100%) invert(100%) sepia(3%) saturate(520%) hue-rotate(264deg) brightness(115%)
      contrast(100%);
    transform: rotate(0deg);
  }

  &:hover {
    color: #fff;
    background: #3f2c48;
    border-radius: 6px;
    text-decoration: none;
  }

  &.active {
    background: ${(props) => props.theme.colors.navSelectedBackground};
    border-right: 5px solid ${(props) => props.theme.colors.navSelectedBackground};
    border-radius: 6px;
    color: ${(props) => props.theme.colors.sidebarBackground};

    svg {
      filter: brightness(0) saturate(100%) invert(6%) sepia(7%) saturate(6515%) hue-rotate(240deg) brightness(96%)
        contrast(88%);
    }
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 0;
    padding: 10px 3px;
    border-radius: 0px;

    svg {
      display: inline-flex;
      align-self: center;
      top: 0px;
      width: 16px;
      height: 16px;
      position: relative;
      filter: brightness(0) saturate(100%) invert(100%) sepia(3%) saturate(520%) hue-rotate(264deg) brightness(115%)
        contrast(100%);
    }

    &:hover {
      border-radius: 0px;
    }

    &.active {
      border-right: 4px solid ${(props) => props.theme.colors.navSelectedBackground};
      border-radius: 0px;
      background: ${(props) => props.theme.colors.sidebarBackground};
      svg {
        filter: brightness(0) saturate(100%) invert(92%) sepia(13%) saturate(1448%) hue-rotate(13deg) brightness(108%)
          contrast(91%);
      }
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

export const NavItemIcon = styled(SvgIcon)`
  width: 12px;
  height: 12px;
  margin-right: 0.5rem;
  transform: rotate(180deg);

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 20px;
    height: 20px;
    margin-left: 22px;
  }
`;

// Material icons have padding in their SVG that makes them look smaller in navs
// compared to icons from <SvgIcon>. This transforms their inner SVG to make
// them line up properly.

export const NavItemMaterialIcon = styled('span')`
  display: inline-flex;
  margin-right: 0.5em;

  svg {
    transform: scale(1.25);
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 20px;
    height: 20px;
    margin-left: 22px;
  }
`;

export const Divider = styled.div`
  background: rgba(221, 203, 231, 0.2);
  margin: 20px 0px;
  height: 1px;
`;

export const SectionLabel = styled.div`
  font-style: normal;
  font-weight: 700;
  font-size: 14px;
  line-height: 16px;
  margin: 0px 0px 6px 18px;
  color: ${(props) => props.theme.colors.navSectionLabelColor};

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const NavSection = styled.nav`
  display: flex;
  flex-direction: column;
`;
