import styled from 'styled-components';

export const Root = styled.main`
  min-height: 100vh;
`;

export const Button = styled.button`
  background-color: #20bfdd;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  display: block;
  font:
    500 100% Roboto,
    sans-serif;
  height: 48px;
  width: 100%;
`;

export const Content = styled.div`
  display: grid;
  grid-template-columns: 890px 1fr;
  margin: 4rem auto;
  max-width: 1300px;
`;
