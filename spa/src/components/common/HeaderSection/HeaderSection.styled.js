import styled from 'styled-components';

export const H1 = styled.h1`
  font-size: ${(props) => props.theme.fontSizesUpdated.h1};
  font-family: ${(props) => props.theme.systemFont};
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.sidebarBackground};
`;

export const Subtitle = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-family: ${(props) => props.theme.systemFont};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  margin-bottom: 3rem;
`;
