import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { DevTool } from '@hookform/devtools';

import Amount from './Amount';
import validator from './validator';
import { PaymentFormTemplate } from '/src/../.storybook/templates';
import { INPUT_NAME as DEFAULT_NAME } from './constants';

const DEFAULT_AMOUNT = 0;

const args = {
  component: Amount,
  labelText: 'Monthly amount',
  amountFrequency: 'month',
  amountCurrencySymbol: '$',
  presetAmounts: [100, 200, 300],
  defaultValue: DEFAULT_AMOUNT,
  allowUserSetValue: true,
  helperText: "Select how much you'd like to contribute",
  name: DEFAULT_NAME,
  includeDevTools: true,
  submitSuccessMessage: 'successful submit',
  validator,
  defaultArgs: { [DEFAULT_NAME]: DEFAULT_AMOUNT }
};

const ONE_TIME_NAME = 'one-time-amount';
const oneTime = {
  ...args,
  labelText: 'Amount',
  amountFrequency: '',
  // each need a unique name property for storybook to work
  name: ONE_TIME_NAME,
  defaultArgs: { [ONE_TIME_NAME]: DEFAULT_AMOUNT }
};

const DEFAULT_USER_SET_VALUE_NAME = 'default-set-amount';
const defaultUserSetValue = {
  ...args,
  defaultValue: 12.37,
  name: DEFAULT_USER_SET_VALUE_NAME,
  defaultArgs: { [DEFAULT_USER_SET_VALUE_NAME]: DEFAULT_AMOUNT }
};

const FREE_FORM_DISABLED_NAME = 'free-form-disabled-amount';
const freeFormDisabled = {
  ...args,
  allowUserSetValue: false,
  name: FREE_FORM_DISABLED_NAME,
  defaultArgs: { [FREE_FORM_DISABLED_NAME]: DEFAULT_AMOUNT }
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

export const Default = PaymentFormTemplate.bind({});
Default.args = {
  ...args
};

export const OneTime = PaymentFormTemplate.bind({});
OneTime.args = {
  ...oneTime
};

export const WithDefaultFreeForm = PaymentFormTemplate.bind({});
WithDefaultFreeForm.args = {
  ...defaultUserSetValue
};

export const FreeFormInputDisabled = PaymentFormTemplate.bind({});
FreeFormInputDisabled.args = {
  ...freeFormDisabled
};
