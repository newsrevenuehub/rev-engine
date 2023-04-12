import styled from 'styled-components';

export const Root = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.colors.cstm_mainBackground ?? props.theme.colors.white};
  font-family: ${(props) => props.theme.systemFont};
`;

export const Wrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const InnerContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: ${(props) => props.theme.colors.cstm_formPanelBackground ?? props.theme.colors.white};
  box-shadow: ${(props) => props.theme.shadows[1]};
  width: 100%;
  max-width: 700px;
  border-top: 6px solid ${(props) => props.theme.colors.cstm_ornaments ?? props.theme.colors.primary};
  margin: 2rem 0;
  padding: 1rem 3rem;
`;

export const Header = styled.h2`
  font-family: ${(props) => props.theme.font.heading};
  font-size: ${(props) => props.theme.fontSizes[4]};
  font-weight: 900;
  color: ${(props) => props.theme.colors.grey[4]};
  margin: 0;
  margin-bottom: 1rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: ${(props) => props.theme.fontSizes[4]};
  }
`;

export const Text = styled.p`
  font-family: ${(props) => props.theme.systemFont};
`;
