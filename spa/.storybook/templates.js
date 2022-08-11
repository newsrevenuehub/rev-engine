import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { DevTool } from '@hookform/devtools';

export const PaymentFormTemplate = ({
  includeDevTools,
  submitSuccessMessage,
  validator,
  defaultArgs,
  component: Component,
  ...args
}) => {
  const methods = useForm({
    resolver: async (data, context, options) => {
      const schema = Yup.object({ [args.name]: validator }).required();
      const result = await yupResolver(schema)(data, { mode: 'sync' }, { ...options, mode: 'sync' });
      return result;
    },
    defaultArgs: {
      [args.name]: 0
    }
  });
  // this is used to conditionally display visible text in template when form submission suceeds
  // which will give us something perceptible to look for in narrow unit test of the amount form component
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState(null);

  const { handleSubmit, control, reset, unregister } = methods;

  return (
    <div className="mx-auto md:p-12 container">
      <form
        onReset={() => {
          reset({ amount: 0 });
        }}
        onSubmit={handleSubmit((data) => {
          try {
            setSubmittedAmount(data[args.name]);
            setSubmitSuccess(true);
            unregister(args.name);
            reset({ ...defaultArgs });
          } catch (e) {
            console.error('handleSubmit error', e);
          }
        })}
        className="flex flex-col items-center"
      >
        <Component {...args} {...methods} />
        <button className="mt-8  bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="submit">
          Submit
        </button>
        <button className="mt-3 bg-gray-400 text-gray-800 font-bold rounded py-2 px-4" type="reset">
          Reset
        </button>
      </form>
      {submitSuccess && <p>{`${submitSuccessMessage} ${submittedAmount}`}</p>}
      {includeDevTools && <DevTool control={control} />}
    </div>
  );
};
