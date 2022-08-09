import styled from 'styled-components';
import MaterialRadio from '@material-ui/core/Radio';

export const DFrequency = styled.ul`
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

export const Radio = styled(MaterialRadio)``;

export const CheckBoxField = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: -9px;
`;

export const CheckboxLabel = styled.label`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;
