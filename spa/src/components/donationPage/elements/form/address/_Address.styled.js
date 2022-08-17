import styled from 'styled-components';
import Input from 'elements/inputs/Input';

export const ConditionallyHiddenInput = styled(Input)`
  display: ${(props) => (props.show ? 'block' : 'none')};
`;
