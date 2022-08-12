import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { DevTool } from '@hookform/devtools';

export const RHFFormTemplate = ({
  includeDevTools,
  submitSuccessMessage,
  validator,
  component: Component,
  ...args
}) => {
  const resolver = yupResolver(validator);
  const methods = useForm({
    resolver
  });
  // this is used to conditionally display visible text in template when form submission suceeds
  // which will give us something perceptible to look for in narrow unit test of the amount form component
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const { handleSubmit, control, reset } = methods;

  // see "Rules" section here and recommendation to do this with useEffect: https://react-hook-form.com/api/useform/reset
  useEffect(() => {
    if (submitSuccess) reset(null, { keepDefaultValues: true });
  }, [submitSuccess, reset]);

  return (
    <FormProvider {...methods}>
      <div className="mx-auto md:p-12 container">
        <form
          onSubmit={handleSubmit((data) => {
            try {
              setSubmittedData(data);
              setSubmitSuccess(true);
            } catch (e) {
              console.error('handleSubmit error', e);
            }
          })}
          className="flex flex-col items-center"
        >
          <Component {...args} />
          <button className="mt-8  bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="submit">
            Submit
          </button>
          <button className="mt-3 bg-gray-400 text-gray-800 font-bold rounded py-2 px-4" type="reset">
            Reset
          </button>
        </form>
        {submitSuccess && <p>{`${submitSuccessMessage} ${JSON.stringify(submittedData)}`}</p>}
        {includeDevTools && <DevTool control={control} />}
      </div>
    </FormProvider>
  );
};

RHFFormTemplate.propTypes = {
  includeDevTools: PropTypes.bool,
  submitSuccessMessage: PropTypes.string,
  validator: PropTypes.func,
  defaultValues: PropTypes.object,
  component: PropTypes.elementType,
  args: PropTypes.object
};
