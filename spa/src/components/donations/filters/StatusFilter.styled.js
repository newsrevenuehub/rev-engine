import styled from 'styled-components';
import darken from 'styles/utils/darken';

export const StatusFilter = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const Statuses = styled.ul`
  padding: 0;
  margin: 0;
  display: flex;
  list-style: none;
  flex-direction: row;
  flex-wrap: wrap;
`;

export const StatusBadge = styled.li`
  margin: 0rem 1rem 1rem;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1px solid;
  cursor: pointer;
  border-color: ${(props) =>
    props.selected ? darken(props.theme.colors.primary) : darken(props.theme.colors.grey[0])};
  background: ${(props) => (props.selected ? props.theme.colors.primary : props.theme.colors.grey[0])};

  p {
    font-weight: ${(props) => (props.selected ? 'bold' : '')};
    color: ${(props) => (props.selected ? props.theme.colors.white : props.theme.colors.black)};
  }
`;
