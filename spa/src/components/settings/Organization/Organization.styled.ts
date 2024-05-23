import BaseInfoTooltip from 'components/account/Profile/InfoTooltip';
import { TextField } from 'components/base';
import styled from 'styled-components';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const ContentForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 25px;
`;

export const TooltipContainer = styled.div`
  position: relative;
`;

export const InfoTooltip = styled(BaseInfoTooltip)`
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

export const WarningMessage = styled.div`
  display: grid;
  grid-template-columns: 15px 1fr;
  padding: 9px;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background-color: ${(props) => `${props.theme.colors.error.primary}1A`};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  max-width: 700px;

  svg {
    width: 15px;
    height: 15px;
    fill: ${(props) => props.theme.colors.error.primary};
  }
`;

export const ActionWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;

  & button:last-child {
    width: 123px;
  }
`;

export const Disclaimer = styled.span`
  margin-top: 20px;
  font-style: italic;
  color: ${(props) => props.theme.colors.muiGrey[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
`;

export const Link = styled.a`
  color: ${(props) => props.theme.colors.account.blueLink};
  font-weight: 500;
`;
