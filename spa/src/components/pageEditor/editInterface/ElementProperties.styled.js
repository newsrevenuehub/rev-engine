import styled from 'styled-components';

export const ElementProperties = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export const ElementHeading = styled.div`
  text-align: center;
  padding: 1rem;
`;

export const ElementEditor = styled.div``;

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
