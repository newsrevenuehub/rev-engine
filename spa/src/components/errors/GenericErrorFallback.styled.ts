import styled from 'styled-components';

export const Root = styled.p`
  align-items: center;
  background-color: #fee6eb;
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 12px;
  color: ${({ theme }) => theme.basePalette.secondary.error};
`;
