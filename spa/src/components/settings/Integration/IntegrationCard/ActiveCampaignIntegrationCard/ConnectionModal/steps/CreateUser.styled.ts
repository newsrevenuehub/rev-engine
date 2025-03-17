import styled from 'styled-components';

export const Bullets = styled.ul`
  margin-left: 0;
  padding-left: 1.5em;

  & li {
    margin-bottom: 1em;
    margin-left: 0;
  }
`;

export const Screenshots = styled.div`
  display: grid;
  gap: 30px;
  grid-template-columns: repeat(2, 200px);
  padding-top: 20px;
`;
