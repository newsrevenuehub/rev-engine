import * as S from './Input.styled';
import PropTypes from 'prop-types';

// Animations
import { AnimatePresence } from "framer-motion";

const errorsAnimation = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50}
}

const hasErrors = errors => errors.length > 0;

function Input({ value, onChange, label, type, errors = [] }) {
  return (
    <S.Wrapper>
      {label && <S.Label htmlFor={label}>{label}</S.Label>}
      <S.Input value={value} onChange={onChange} type={type} hasErrors={hasErrors(errors)} id={label}/>
      <AnimatePresence>
        {hasErrors(errors) && (
          <S.Errors {...errorsAnimation}>
            {errors.map((error) => (
              <S.Error key={error}>{error}</S.Error>
            ))}
          </S.Errors>
        )}
      </AnimatePresence>
    </S.Wrapper>
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
  label: PropTypes.string,
  type: PropTypes.oneOf(Object.values(Input.types)),
  errors: PropTypes.array,
};

export default Input;
