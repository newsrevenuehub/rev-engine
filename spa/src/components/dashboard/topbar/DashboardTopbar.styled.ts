import styled from 'styled-components';

export const Root = styled.div`
  width: 100%;
  height: 48px;
  background: ${(props) => props.theme.colors.topbarBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  left: 260px;
  flex-direction: row;
  position: fixed;
  z-index: ${(props) => props.theme.zIndex.header};

  /* Left position is responsive to leave room for DashboardSidebar. */

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    left: 66px;
  }
`;

export const TopMenu = styled.div`
  flex: 1;
  padding: 0px 20px 0px 25px;
  margin-right: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: end;
`;
