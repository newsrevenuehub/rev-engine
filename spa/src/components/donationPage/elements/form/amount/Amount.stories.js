import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { DevTool } from '@hookform/devtools';

import Amount from './Amount';
import validator from './validator';

const args = {
  labelText: 'Monthly amount',
  amountFrequency: 'month',
  amountCurrencySymbol: '$',
  presetAmounts: [100, 200, 300],
  defaultValue: 0,
  allowUserSetValue: true,
  helperText: "Select how much you'd like to contribute",
  name: 'amount',
  includeDevTools: true,
  submitSuccessMessage: 'successful submit'
};

const oneTime = {
  ...args,
  labelText: 'Amount',
  amountFrequency: '',
  // each need a unique name property for storybook to work
  name: 'one-time-amount'
};

const defaultUserSetValue = {
  ...args,
  defaultValue: 12.37,
  name: 'default-set-amount'
};

const freeFormDisabled = {
  ...args,
  allowUserSetValue: false,
  name: 'free-form-disabled-amount'
};

export default {
  title: 'Amount',
  component: Amount
};

const Template = ({ includeDevTools, submitSuccessMessage, ...args }) => {
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
            reset({ [args.name]: args.defaultValue || 0 });
          } catch (e) {
            console.error('handleSubmit error', e);
          }
        })}
        className="flex flex-col items-center"
      >
        <Amount {...args} {...methods} />
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

export const Default = Template.bind({});
Default.args = {
  ...args
};

export const OneTime = Template.bind({});
OneTime.args = {
  ...oneTime
};

export const WithDefaultFreeForm = Template.bind({});
WithDefaultFreeForm.args = {
  ...defaultUserSetValue
};

export const FreeFormInputDisabled = Template.bind({});
FreeFormInputDisabled.args = {
  ...freeFormDisabled
};
