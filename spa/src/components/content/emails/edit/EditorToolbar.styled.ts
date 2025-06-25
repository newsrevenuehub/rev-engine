import styled from 'styled-components';

export const Root = styled.div`
  border: 1px solid ${({ theme }) => theme.basePalette.greyscale[70]};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 4px;
  width: 540px;
`;

export const Section = styled.div`
  display: flex;
  gap: 5px;
`;
