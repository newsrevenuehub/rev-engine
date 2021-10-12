import { useEffect } from 'react';

// Utils
import isEmpty from 'lodash.isempty';

/**
 * Given a ref to a form, and an object of errors whose keys match form input 'name' attributes,
 * focus the first input in the form that has an error.
 * @param {Ref} formRef - a react ref for the form
 * @param {Object} errors - an object whose keys are input names
 */
function useErrorFocus(formRef, errors) {
  useEffect(() => {
    console.log('those errors tho', errors);
    if (!isEmpty(errors)) {
      const errorNames = Object.keys(errors);
      const inputNames = [...formRef.current.elements].map((el) => el.name);
      const firstErrorName = inputNames.find((name) => errorNames.indexOf(name) !== -1);
      formRef.current.elements[firstErrorName]?.focus();
    }
  }, [errors, formRef]);
}

export default useErrorFocus;
