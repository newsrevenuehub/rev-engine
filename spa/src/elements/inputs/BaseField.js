import * as S from './BaseField.styled';
import PropTypes from 'prop-types';

// Animations
import { AnimatePresence } from 'framer-motion';

const hasErrors = (errors) => errors.length > 0;

function BaseField({ label, errors, inline, labelProps, children }) {
  return (
    <S.Wrapper>
      <S.FieldWrapper inline={inline}>
        {label && (
          <S.Label htmlFor={label} {...labelProps}>
            {label}
          </S.Label>
        )}
        {children}
      </S.FieldWrapper>
      <AnimatePresence>
        {hasErrors(errors) && (
          <S.Errors {...S.errorsAnimation}>
            {errors.map((error) => (
              <S.Error key={error}>{error}</S.Error>
            ))}
          </S.Errors>
        )}
      </AnimatePresence>
    </S.Wrapper>
  );
}

BaseField.propTypes = {
  label: PropTypes.string,
  inline: PropTypes.bool,
  errors: PropTypes.arrayOf(PropTypes.string),
  labelProps: PropTypes.object
};

BaseField.defaultProps = {
  inline: false,
  errors: [],
  labelProps: {}
};

export default BaseField;
