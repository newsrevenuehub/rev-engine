import { forwardRef } from 'react';
import * as S from './InputAccount.styled';
import BaseField from 'elements/inputs/BaseField';

const InputAccount = forwardRef(({ value, onChange, type, name, ...props }, ref) => (
  <BaseField {...props}>
    <S.Input ref={ref} value={value} onChange={onChange} type={type} data-testid={props.testid} />
  </BaseField>
));

export default InputAccount;
