import styled from 'styled-components';

export const Root = styled.p`
  width: 100%;
  background-color: #fee6eb;
  padding: 12px;
  color: ${({ theme }) => theme.basePalette.secondary.error};
`;
