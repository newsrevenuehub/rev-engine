import React from 'react';

import InputError from './InputError';

const args = {
  message: 'You did not win at inputting'
};

const noMessage = {};

export default {
  title: 'elements/InputError',
  component: InputError
};

const Template = ({ ...args }) => {
  return (
    <div>
      <InputError {...args} />
    </div>
  );
};

export const Default = Template.bind({});
Default.args = {
  ...args
};

export const NoMessage = Template.bind({});
NoMessage.args = {
  ...noMessage
};
