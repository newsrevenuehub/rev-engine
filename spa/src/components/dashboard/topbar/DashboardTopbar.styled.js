import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';

export const DashboardTopbar = styled.div`
  width: 100%;
  height: 48px;
  background: ${(props) => props.theme.colors.purpleLight};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  flex-direction: row;
`;

export const TopMenu = styled.div`
  flex: 1;
  text-align: right;
  padding: 0px 20px 0px 25px;
`;

export const LogoutLink = styled.div`
  padding: 0px 0px 0px 25px;
  cursor: pointer;
  color: ${(props) => props.theme.colors.white};
  max-width: 120px;
  margin-left: auto;
  a {
    color: ${(props) => props.theme.colors.white};
  }
`;

export const TopLogo = styled.div`
  background: ${(props) => props.theme.colors.purpleDark};
  flex: 0 0 260px;
  display: block;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const TopLogoMobile = styled.div`
  background: ${(props) => props.theme.colors.purpleDark};
  flex: 0 0 66px;
  display: none;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: block;
  }
`;

export const Logo = styled.img`
  margin-top: 8px;
  height: 29px;
  padding-left: 26px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    height: 29px;
    padding-left: 8px;
  }
`;

export const LogoutIcon = styled(SvgIcon)`
  width: 12px;
  height: 12px;
  margin-top: 17px;
  margin-right: 0.5rem;
  transform: rotate(180deg);
  filter: invert(100%) sepia(0%) saturate(7486%) hue-rotate(74deg) brightness(102%) contrast(99%);
`;
