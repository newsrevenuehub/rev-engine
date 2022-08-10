import React from 'react';
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
  defaultValue: null,
  allowUserSetValue: true,
  helperText: "Select how much you'd like to contribute",
  name: 'amount',
  includeDevTools: true
};

const oneTime = {
  ...args,
  labelText: 'Amount',
  amountFrequency: null,
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

const Template = ({ includeDevTools, ...args }) => {
  const methods = useForm({
    resolver: async (data, context, options) => {
      const schema = Yup.object({ [args.name]: validator }).required();
      console.log(data, context, options);
      const result = await yupResolver(schema)(data, { mode: 'sync' }, { ...options, mode: 'sync' });
      console.log('result', result);
      return result;
    },
    defaultArgs: {
      [args.name]: 0
    }
  });
  const { handleSubmit, control, reset, unregister } = methods;

  return (
    <div className="mx-auto md:p-12 container">
      <form
        onReset={() => {
          reset({ amount: 0 });
        }}
        onSubmit={handleSubmit((data) => {
          try {
            console.log('handleSubmit success', data);
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
      {includeDevTools && <DevTool control={control} />}
    </div>
  );
};

export const Monthly = Template.bind({});
Monthly.args = {
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
