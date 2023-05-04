import styled from 'styled-components';

export const Root = styled.span`
  align-items: center;
  background: ${({ theme }) => theme.colors.muiGrey[100]};
  border-radius: ${({ theme }) => theme.muiBorderRadius.md};
  color: ${({ theme }) => theme.colors.account.purple[1]};
  display: inline-flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
  font-weight: 600;
  height: 15px;
  line-height: 100%;
  justify-content: center;
  text-transform: uppercase;
  width: 48px;
`;
