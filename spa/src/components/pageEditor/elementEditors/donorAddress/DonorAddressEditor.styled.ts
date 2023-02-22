import styled from 'styled-components';

export const Checkboxes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const Header = styled.h4`
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 600;
  margin-bottom: 10px;
`;

export const Tip = styled.p`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  margin-bottom: 18px;
`;
