import styled from 'styled-components';

export const Filters = styled.div``;

export const FilterWrapper = styled.div`
  padding: 2rem 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${(props) => props.theme.colors.grey[0]};
  }
`;

export const FilterLabel = styled.p`
  margin: 0;
  margin-right: 1rem;
`;

export const ResultsCount = styled.p`
  padding: 2rem 0;
  span {
    display: inline-block;
    color: ${(props) => props.theme.colors.primary};
  }
`;
