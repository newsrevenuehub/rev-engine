import styled from 'styled-components';

export const DashboardSection = styled.section`
  border-radius: ${(p) => p.theme.radii[1]};
  box-shadow: ${(p) => p.theme.shadows[1]};
  background: ${(p) => p.theme.colors.paneBackground};
  min-height: 200px;
  padding: 2rem;
`;
