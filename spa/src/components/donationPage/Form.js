import React from 'react';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { PaymentElement } from '@stripe/react-stripe-js';

const useYupValidationresolver = (validationSchema) =>
  useCallback(
    async (data) => {
      try {
        const values = await validationSchema.validate(data, { abortEary: false });
        return {
          values,
          errors: {}
        };
      } catch (errors) {
        return {
          values: {},
          errors: errors.inner.reduce((allErrors, currentError) => ({
            ...allErrors,
            [currentError.path]: {
              type: currentError.type ?? 'validation',
              message: currentError.message
            }
          }))
        };
      }
    },
    [validationSchema]
  );

export default function Form({
  onSubmit,
  formLevelMessage,
  dynamicElements,
  validationSchema,
  buttonText,
  disabled,
  loading
}) {
  const resolver = useYupValidationresolver(validationSchema);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {dynamicElements.map(({ element: Element, registerName, ...rest }, idx) => {
        const params = [...rest];
        if (registerName) {
          params.registerName = registerName;
          params.registerFn = register;
        }
        const elemError = registerName && errors?.[registerName];
        if (elemError) {
          params.error = elemError;
        }
        return <Element key={`donation-page-dynamic-form-element-${idx}`} {...params} />;
      })}
      <PaymentElement />
      <button disabled={disabled || loading} type="submit">
        {loading ? <div className="spinner" id="spinner"></div> : <span>{buttonText}</span>}
      </button>
      {formLevelMessage && <div id="form-level-message">{formLevelMessage}</div>}
    </form>
  );
}
