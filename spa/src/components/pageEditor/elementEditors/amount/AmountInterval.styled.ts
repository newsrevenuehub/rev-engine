import { ButtonBase } from '@material-ui/core';
import { TextField } from 'components/base';
import styled from 'styled-components';

export const Header = styled.h6`
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  font-weight: 600;
  margin: 0 0 20px 0;
`;

export const Items = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const OtherAmountContainer = styled.form`
  align-items: center;
  display: flex;
  gap: 10px;
  margin-top: 25px;
`;

export const OtherAmountField = styled(TextField)`
  && input {
    appearance: textfield;
    height: 13px; /* 40px total */
    width: 105px;

    /* Hide spinner controls. */

    ::-webkit-inner-spin-button,
    ::-webkit-outer-spin-button {
      display: none;
      margin: 0;
    }
  }

  && label {
    display: none;
  }
`;

export const OtherAmountButton = styled(ButtonBase)`
  && {
    /* To win specifity against ButtonBase. */
    margin-left: 14px;
  }

  height: 24px;
  width: 24px;

  svg {
    color: ${({ theme }) => theme.basePalette.secondary.success};
  }
`;
