import styled from 'styled-components';

export const DashboardSection = styled.section`
  border-radius: ${(props) => props.theme.radii[0]};
  box-shadow: ${(props) => props.theme.shadows[0]};
  background: ${(props) => props.theme.colors.paneBackground};
  min-height: 200px;
`;

export const SectionHeading = styled.h2`
  text-align: center;
  font-size: ${(props) => props.theme.fontSizes[1]};
  background: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.white};
  border-top-right-radius: ${(props) => props.theme.radii[0]};
  border-top-left-radius: ${(props) => props.theme.radii[0]};
  padding: 0.5rem;
`;

export const SectionContent = styled.div`
  padding: 2rem;
`;
