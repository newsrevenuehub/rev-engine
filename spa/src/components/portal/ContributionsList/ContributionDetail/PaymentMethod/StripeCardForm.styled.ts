import styled from 'styled-components';

export const CardElementContainer = styled.div<{ $error: boolean }>`
  background: white;
  border: 1.5px solid rgb(196, 196, 196);
  border-radius: 4px;
  padding: 14px;
  margin: 6px 0;

  ${(props) => props.$error && `border-color: ${props.theme.basePalette.secondary.error}`};
`;

export const CardElementLabel = styled.p`
  font-weight: 600;
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  margin-bottom: 0;
`;

export const Error = styled.p`
  color: ${({ theme }) => theme.basePalette.secondary.error};
`;

export const Fields = styled.div`
  display: grid;
  gap: 35px;
`;
