import styled from 'styled-components';

export const Checkboxes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const Header = styled.h4`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 600;
`;

export const Tip = styled.p`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  margin-bottom: 20px;
`;
