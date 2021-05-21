import styled from 'styled-components';

import { DashboardSection } from 'components/dashboard/DashboardSection.styled';

export const Organization = styled.div`
  flex: 1;
`;
export const OrganizationPanel = styled(DashboardSection)`
  max-width: ${(props) => props.theme.maxWidths.lg};
  margin: 0 auto;
`;
