import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Buttons = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding-top: 1rem;
  margin-bottom: 2rem;

  & button:not(:last-child) {
    margin-right: 2rem;
  }
`;

export const Controls = styled.div`
  width: 90%;
  margin: 2rem auto;
`;
