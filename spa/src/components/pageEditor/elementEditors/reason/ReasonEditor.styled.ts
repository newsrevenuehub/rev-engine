import styled from 'styled-components';

export const Error = styled.p`
  color: ${({ theme }) => theme.colors.error.primary};
`;

export const RequiredContainer = styled.div`
  margin-left: 32px;
`;

export const ReasonPrompt = styled.p`
  font-size: 16px;
  margin: 24px 0;
`;

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;
