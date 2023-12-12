import styled from 'styled-components';

export const Root = styled.div`
  align-items: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  padding: 24px;
  background-color: #fee6eb;
`;

export const Heading = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
`;

export const Message = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;
