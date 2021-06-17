import styled from 'styled-components';

export const EditInterfaceTabs = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0;
  list-style: none;
  border-bottom: 1px solid ${(props) => props.theme.colors.grey[0]};
`;

export const Tab = styled.li`
  cursor: pointer;
  text-align: center;
  flex: 1;
  border-bottom: 2px solid;
  border-color: ${(props) => (props.selected ? props.theme.colors.primary : 'transparent')};
  padding: 1rem;
`;
