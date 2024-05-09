import { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import EmailTextField, { EmailTextFieldProps } from './EmailTextField';

function EmailTextFieldDemo(props: Partial<EmailTextFieldProps>) {
  const [value, setValue] = useState('');

  return (
    <EmailTextField
      {...props}
      onAcceptSuggestedValue={setValue}
      onChange={({ target }) => setValue(target.value)}
      value={value}
    />
  );
}

const meta: Meta<typeof EmailTextField> = {
  component: EmailTextFieldDemo,
  title: 'Base/EmailTextField'
};

export default meta;

type Story = StoryObj<typeof EmailTextFieldDemo>;

export const Default: Story = {};
Default.args = { label: 'Email Address' };
