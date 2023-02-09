import styled from 'styled-components';

export const Root = styled.div`
  width: calc(100% - 260px);
  height: 48px;
  background: ${(props) => props.theme.colors.topbarBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  justify-content: flex-end;
  left: 260px;
  flex-direction: row;
  padding-right: 40px;
  position: fixed;
  z-index: ${(props) => props.theme.zIndex.header};

  /* Left position is responsive to leave room for DashboardSidebar. */

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    left: 66px;
    width: calc(100% - 66px);
  }
`;
