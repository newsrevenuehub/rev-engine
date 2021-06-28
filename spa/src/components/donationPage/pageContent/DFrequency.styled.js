import styled from 'styled-components';
import { Radio as SemanticRadio } from 'semantic-ui-react';

export const DFrequency = styled.ul`
  padding: 0;
`;

const RADIO_SIZE = '25px';
export const Radio = styled(SemanticRadio)`
  line-height: ${RADIO_SIZE} !important;

  &:not(:last-child) {
    margin-right: 2rem;
  }

  & label::before {
    height: ${RADIO_SIZE} !important;
    width: ${RADIO_SIZE} !important;
  }

  & label::after {
    height: ${RADIO_SIZE} !important;
    width: ${RADIO_SIZE} !important;
    background-color: ${(props) => props.theme.pageColorPrimary} !important;
  }
`;
