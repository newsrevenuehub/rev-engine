import styled from 'styled-components';

export const InputGroup = styled.div``;

export const GroupedLabel = styled.p`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;

export const GroupedWrapper = styled.div`
  display: flex;
  flex-direction: row;

  & > div:not(:last-child) {
    margin-right: 2rem;
  }

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    flex-direction: column;
    margin: 0;
  }
`;
