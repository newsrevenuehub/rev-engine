import styled from 'styled-components';

export const Root = styled.div`
  align-items: center;
  background-color: #f4ecee;
  display: flex;
  flex-direction: column;
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  gap: 20px;
  height: 175px;
  justify-content: center;

  p {
    color: ${({ theme }) => theme.basePalette.secondary.error};
    margin: 0;
  }
`;
