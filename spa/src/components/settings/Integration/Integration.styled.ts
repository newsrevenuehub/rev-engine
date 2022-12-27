import styled from 'styled-components';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const Content = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 40px;

  & [data-testid^='integration-card'] {
    width: 314px;
  }
`;
