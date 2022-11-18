import styled from 'styled-components';

export const Input = styled.input`
  width: 100%;
  height: 40px;
  padding: 0.6rem 0.6rem 0.6rem 2.5rem;
  font-family: ${(props) => props.theme.systemFont};
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  border-radius: ${(props) => props.theme.muiBorderRadius.md};
  background-color: ${(props) => props.theme.colors.muiGrey[100]};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  background-repeat: no-repeat;
  background-attachment: scroll;
  background-position: left;
  background-position-x: 0.7rem;
  background-size: 1.1rem;
  border-color: transparent;

  &::placeholder {
    color: ${(props) => props.theme.colors.muiGrey[600]};
    font-style: normal;
  }
`;
