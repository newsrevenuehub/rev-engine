import { ButtonBase } from '@material-ui/core';
import { TextField } from 'components/base';
import styled from 'styled-components';

export const Controls = styled.div`
  /* Clears float: left on Legend. */
  clear: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
`;

export const Legend = styled.legend`
  background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
  border-top-left-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  border-top-right-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  padding: 4px 10px;
  width: 100%;

  /*
  Move the legend out of the default position (inset in the fieldset border)
  into a predictable place.
  */
  float: left;
`;

export const Option = styled.div`
  background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  display: flex;
  justify-content: space-between;
  padding: 10px 0 10px 15px;
  word-wrap: anywhere;
`;

export const NewOptionButton = styled(ButtonBase)`
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

export const NewOptionContainer = styled.form`
  background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  padding: 8px 10px;
`;

export const NewOptionTextField = styled(TextField)`
  width: 100%;

  && input {
    background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  }

  && label {
    display: none;
  }
`;

export const RemoveOptionButton = styled(ButtonBase)`
  height: 24px;
  width: 32px;
`;

export const Root = styled.fieldset`
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  border-color: ${({ theme }) => theme.basePalette.greyscale['30']};
  border-style: solid;
  padding: 6px;
`;
