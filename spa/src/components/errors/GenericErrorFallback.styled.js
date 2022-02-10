import styled from 'styled-components';

export const GenericErrorFallback = styled.div`
  width: 100%;
  padding: 2rem;
  background: ${(props) => props.theme.colors.caution}4D;
  color: ${(props) => props.theme.colors.caution};

  p {
    font-weight: bold;
    color: ${(props) => props.theme.colors.caution};
  }

  span {
    color: #4183c4;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;
