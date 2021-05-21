import styled from 'styled-components';

export const FormGroup = styled.fieldset`
  border: none;
  padding: 0;
  display: flex;
  flex-direction: row;
  margin: 1rem 0;
  & > * {
    flex: 1;
    margin: 0 1rem;
  }

  @media (${(p) => p.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
    & > * {
      flex: 1;
      margin: 0;
    }
  }
`;
