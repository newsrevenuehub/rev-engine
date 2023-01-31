import styled from 'styled-components';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const Content = styled.div`
  display: grid;
  gap: 40px;
  grid-template-columns: repeat(auto-fit, 314px);
`;
