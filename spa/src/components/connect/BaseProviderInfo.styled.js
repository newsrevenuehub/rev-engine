import styled from 'styled-components';
import Svg from 'assets/icons/SvgIcon';

export const BaseProviderInfo = styled.li`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
  margin: 2rem 0;
  width: 100%;

  @media (${(p) => p.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
    margin: 3rem 0;
  }
`;

export const LeftContent = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-right: 2rem;
`;

export const RightContent = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-end;
  max-width: 600px;
`;

export const ProviderLogo = styled.img`
  width: 100px;
  height: auto;
`;

export const SvgIcon = styled(Svg)`
  width: 50px;
  height: 50px;
  fill: ${(p) => (p.icon === 'times-circle' ? p.theme.colors.caution : p.theme.colors.success)};
`;
