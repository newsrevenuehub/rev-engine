import { TextField } from 'components/base';
import InfoTooltip from 'components/account/Profile/InfoTooltip';
import styled from 'styled-components';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 25px;
`;

export const TaxStatusContainer = styled.div`
  position: relative;
`;

export const TaxStatusInfoTooltip = styled(InfoTooltip)`
  position: absolute;
  top: 6px;
  right: -10px;
  margin-right: 10px;
`;

export const StyledTextField = styled(TextField)`
  && {
    & ::placeholder {
      font-style: normal;
    }
  }
`;

export const FieldLabelOptional = styled.span`
  color: rgb(112, 112, 112);
  font-style: italic;
  font-weight: normal;
  padding-left: 8px;
`;

export const InputWrapper = styled.div`
  display: grid;
  gap: 17px;
  grid-template-columns: 1fr 1fr;
`;
