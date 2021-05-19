import styled from 'styled-components';

export const DashboardSection = styled.section`
  border-radius: ${(props) => props.theme.radii[1]};
  box-shadow: ${(props) => props.theme.shadows[1]};
  background: ${(props) => props.theme.colors.paneBackground};
  min-height: 200px;
  padding: 2rem;
`;
