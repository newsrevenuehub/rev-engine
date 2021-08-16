import styled from 'styled-components';

export const DonationPageSidebar = styled.aside`
  width: 35%;
  padding: 0 2rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 100%;
    margin-top: 4rem;
  }
`;

export const SidebarContent = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;

  & > li {
    padding: 2rem 0;
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 100%;
    max-width: ${(props) => props.theme.maxWidths.sm};
    margin: 0 auto;
  }
`;
