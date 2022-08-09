import React from 'react';
import { action } from '@storybook/addon-actions';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import Amount, { validator } from './Amount';

const presetAmounts = [
  { displayValue: '$100', value: 100 },
  { displayValue: '$200', value: 200 },
  { displayValue: '$300', value: 300 }
];

export default {
  title: 'Amount',
  component: Amount
};

const Template = ({ ...args }) => {
  const {
    handleSubmit,
    control,
    formState: { errors }
  } = useForm({ resolver: yupResolver(Yup.object({ ...validator }).required()) });

  const onSubmit = (data, e) => console.log(data, e);
  const onError = (errors, e) => console.error(errors, e);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        debugger;
        handleSubmit(onSubmit, onError);
      }}
    >
      <Amount {...args} control={control} />
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="submit">
        Submit
      </button>
    </form>
  );
};

//👇 Each story then reuses that template
export const Default = Template.bind({});
Default.args = {
  labelText: 'Contribution amount',
  presetAmounts: [...presetAmounts],
  defaultPresetIndex: 1,
  defaultUserInputValue: null,
  allowUserSetValue: true,
  defaultUserSetValue: null,
  helperText: "Select how much you'd like to contribute",
  onValueChange: (value) => console.log('value change', value)
};
