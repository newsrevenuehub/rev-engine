import * as S from './Input.styled';
import PropTypes from 'prop-types';
import BaseField from './BaseField';

function Input({ value, onChange, type, ...props }) {
  return (
    <BaseField {...props}>
      <S.Input value={value} onChange={onChange} type={type} />
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
  onChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(Object.values(Input.types))
};

export default Input;
