import styled from 'styled-components';

export const DonationPage = styled.div`
  background: ${(props) => props.theme.colors.background};
`;

export const PageMain = styled.main`
  display: flex;
  flex-direction: row;
  padding: 4rem 0;
`;

export const SideOuter = styled.div`
  flex: 1;
  padding: 0 2rem;
`;

export const SideInner = styled.div`
  background: ${(props) => props.theme.colors.white};
  box-shadow: ${(props) => props.theme.shadows[1]};
  height: 500px;
  max-width: ${(props) => props.theme.maxWidths.md};
  margin: 0 auto;
  border-radius: ${(props) => props.theme.radii[0]};
`;

export const PageElements = styled.ul`
  padding: 3rem 5rem;
  & *:not(:last-child) {
    border-bottom: 1px solid grey;
  }
`;

export const PlansSide = styled.aside`
  width: 35%;
  background: ${(props) => props.theme.colors.white};
`;
