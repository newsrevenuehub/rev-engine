import styled from 'styled-components';

export const Donations = styled.div`
  ${(props) =>
    props.grow &&
    `
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    `}
`;
