import styled from 'styled-components';
import Input from 'elements/inputs/InputOld';

export const ConditionallyHiddenInput = styled(Input)`
  display: ${(props) => (props.show ? 'block' : 'none')};
`;
