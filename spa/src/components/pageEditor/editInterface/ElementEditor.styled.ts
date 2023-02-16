import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const Content = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding: 25px;
`;

export const ContentDetail = styled.div`
  padding: 18px;
`;

export const Header = styled.h5`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 500;
  margin: 0;
`;
