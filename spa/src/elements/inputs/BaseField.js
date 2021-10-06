import * as S from './BaseField.styled';
import PropTypes from 'prop-types';

// Animations
import { AnimatePresence } from 'framer-motion';

const hasErrors = (errors) => errors.length > 0;

function BaseField({ label, errors, inline, labelProps, helpText, required, children }) {
  const renderErrors = (e) => {
    if (Array.isArray(e)) {
      return errors.map((error) => <S.Error key={error}>{error}</S.Error>);
    }
    return <S.Error key={e}>{e}</S.Error>;
  };

  return (
    <S.Wrapper>
      <S.FieldWrapper inline={inline}>
        {label && (
          <S.Label htmlFor={label} {...labelProps}>
            {label} {required && <S.Required>*</S.Required>}
          </S.Label>
        )}
        {children}
      </S.FieldWrapper>
      {helpText && <S.HelpText>{helpText}</S.HelpText>}
      <AnimatePresence>
        {hasErrors(errors) && (
          <S.Errors {...S.errorsAnimation} data-testid={`errors-${label}`}>
            {renderErrors(errors)}
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
