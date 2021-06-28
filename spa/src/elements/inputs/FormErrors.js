import { useEffect, useRef } from 'react';
import { Errors, Error, errorsAnimation } from 'elements/inputs/BaseField.styled';
import { AnimatePresence } from 'framer-motion';
import scrollIfNotVisible from 'utilities/scrollIfNotVisible';

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

  useEffect(() => {
    if (hasErrors(errors) && elRef.current) {
      scrollIfNotVisible(elRef.current);
    }
  }, [errors]);

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
