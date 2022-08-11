import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { DevTool } from '@hookform/devtools';

export const RHFFormTemplate = ({
  includeDevTools,
  submitSuccessMessage,
  validator,
  defaultValues,
  component: Component,
  ...args
}) => {
  const resolver = yupResolver(Yup.object({ [args.name]: validator }).required());

  const methods = useForm({
    resolver,
    defaultValues
  });
  // this is used to conditionally display visible text in template when form submission suceeds
  // which will give us something perceptible to look for in narrow unit test of the amount form component
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const { handleSubmit, control, reset, unregister } = methods;

  return (
    <FormProvider {...methods}>
      <div className="mx-auto md:p-12 container">
        <form
          onReset={() => {
            reset(defaultValues);
          }}
          onSubmit={handleSubmit((data) => {
            try {
              setSubmittedData(data);
              setSubmitSuccess(true);
              unregister();
              reset({ ...defaultValues });
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
