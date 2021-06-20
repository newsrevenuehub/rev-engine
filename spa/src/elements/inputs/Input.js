import * as S from './Input.styled';
import PropTypes from 'prop-types';
import BaseField from 'elements/inputs/BaseField';

function Input({ value, onChange, type, name, ...props }) {
  return (
    <BaseField {...props}>
      <S.Input
        value={value}
        onChange={onChange}
        name={name}
        type={type}
        data-testid={props.testid}
        onClick={props.onClick}
        onFocus={props.onFocus}
      />
    </BaseField>
  );
}

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
