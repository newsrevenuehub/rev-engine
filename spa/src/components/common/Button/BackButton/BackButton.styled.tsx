import styled from 'styled-components';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

// export const Flex = styled.div`
//   position: relative;
//   display: flex;
//   flex-direction: column;
//   align-items: start;
//   font-family: ${(props) => props.theme.systemFont};
// `;

export const Button = styled.button`
  cursor: pointer;
  background: none;
  border: none;
  margin-bottom: 2em;
`;


export const Icon = styled(ExpandMoreIcon)`
  transform: rotate(90deg);
  vertical-align: middle;
  margin-left: -.5em
`;

export const Span = styled.span`
  vertical-align: middle;
`;
