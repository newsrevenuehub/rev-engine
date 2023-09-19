import styled from 'styled-components';
import { TextField } from 'components/base';
import BaseInfoTooltip from './InfoTooltip';

export const StyledTextField = styled(TextField)`
  && {
    & ::placeholder {
      font-style: normal;
    }
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 25px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 18px;
`;

export const FieldLabelOptional = styled.span`
  color: rgb(112, 112, 112);
  font-style: italic;
  font-weight: normal;
  padding-left: 8px;
`;

export const FillRow = styled.div`
  grid-column: 1 / span 2;
`;

export const TooltipContainer = styled.div`
  position: relative;
`;

export const InfoTooltip = styled(BaseInfoTooltip)`
  position: absolute;
  top: 0;
  right: -10px;
  margin-right: 10px;
`;
