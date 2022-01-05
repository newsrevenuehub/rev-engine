import styled from 'styled-components';
import MaterialCheckbox from '@material-ui/core/Checkbox';

export const CheckBoxField = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: flex-end;
  margin-left: -9px;
`;

export const Checkbox = styled(MaterialCheckbox)``;

export const CheckboxLabel = styled.label`
  font-size: ${(props) => props.theme.fontSizes[1]};
`;
