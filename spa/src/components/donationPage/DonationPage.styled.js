import styled from 'styled-components';

export const DonationPage = styled.div`
  background: ${(props) => props.theme.colors.cstm_mainBackground};

  label,
  input {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const NoElements = styled.h4`
  text-align: center;
  font-size: 3rem;
  font-weight: 200;
  padding: 2rem 0;
`;

export const PageMain = styled.main`
  display: flex;
  flex-direction: row;
  max-width: ${(props) => props.theme.maxWidths.xl};
  margin: 0 auto;
  padding: 4rem 0;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;

export const SideOuter = styled.div`
  flex: 1;
  padding: 0 2rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 0 1rem;
  }
`;

export const SideInner = styled.div`
  background: ${(props) => props.theme.colors.cstm_formPanelBackground};
  box-shadow: ${(props) => props.theme.shadows[1]};
  max-width: ${(props) => props.theme.maxWidths.md};
  margin: 0 auto;
  border-radius: ${(props) => props.theme.radii[0]};

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    max-width: 100%;
    width: 100%;
  }
`;

export const DonationContent = styled.div`
  padding: 1rem 5rem 3rem 5rem;
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    padding: 1rem;
  }
`;

export const PageElements = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  & > li {
    padding-top: 2rem;
    margin: 0;
  }

  & > li:not(:last-child) {
    padding-bottom: 2rem;
    border-bottom: 1px ${(props) => props.theme.ruleStyle || 'solid'} ${(props) => props.theme.colors.grey[1]};
  }
`;
