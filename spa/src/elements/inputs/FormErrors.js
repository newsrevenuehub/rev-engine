import { useRef } from 'react';
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
  const elRef = useRef();

  return (
    <AnimatePresence>
      {hasErrors(errors) ? (
        <Errors ref={elRef} {...errorsAnimation}>
          {renderErrors(errors)}
        </Errors>
      ) : null}
    </AnimatePresence>
  );
}

export default FormErrors;
