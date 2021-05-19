import styled from 'styled-components';
import { DashboardSection } from 'components/dashboard/DashboardSection.styled';

export const ProviderConnect = styled(DashboardSection)`
  h2 {
    text-align: center;
  }
`;

export const ProvidersList = styled.ul`
  padding: 1rem 4rem;
  margin: 0 auto;
  max-width: 1000px;
  list-style: none;
  display: flex;
  justify-content: center;
`;

export const ProviderLink = styled.li`
  margin: 2rem 0;
`;
