import { forwardRef } from 'react';
import * as S from './Input.styled';
import PropTypes from 'prop-types';
import BaseField from 'elements/inputs/BaseField';

const Input = forwardRef(({ value, onChange, type, placeholder, name, maxLength, ...props }, ref) => (
  <BaseField {...props}>
    <S.Input
      ref={ref}
      id={props.label}
      value={value}
      onChange={onChange}
      name={name}
      type={type}
      placeholder={placeholder}
      helpText
      maxLength={maxLength}
      data-testid={props.testid}
      onClick={props.onClick}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    />
  </BaseField>
));

Input.types = {
  TEXT: 'text',
  EMAIL: 'email',
  PASSWORD: 'password',
  NUMBER: 'number'
};

Input.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  type: PropTypes.oneOf(Object.values(Input.types))
};

export default Input;
