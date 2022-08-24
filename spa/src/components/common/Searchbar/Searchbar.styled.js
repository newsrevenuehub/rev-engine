import styled from 'styled-components';

export const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 2.5rem;
  border-radius: ${(props) => props.theme.muiBorderRadius.md};
  background-color: ${(props) => props.theme.colors.muiGrey[100]};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  background-repeat: no-repeat;
  background-attachment: scroll;
  background-position: left;
  background-position-x: 0.7rem;
  background-size: 1.1rem;
`;
