import { Errors, Error, errorsAnimation } from 'elements/inputs/BaseField.styled';
import { AnimatePresence } from 'framer-motion';

const hasErrors = (errors) => {
  if (Array.isArray(errors)) return errors.length > 0;
  return !!errors;
};

const renderErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.map((error) => <Error>{error}</Error>);
  } else return <Error>{errors}</Error>;
};

function FormErrors({ errors }) {
  return (
    <AnimatePresence>
      {hasErrors(errors) ? <Errors {...errorsAnimation}>{renderErrors(errors)}</Errors> : null}
    </AnimatePresence>
  );
}

export default FormErrors;
