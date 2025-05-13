import { Meta, StoryObj } from '@storybook/react';
import EmailBlock from './EmailBlock';

const meta: Meta<typeof EmailBlock> = {
  component: EmailBlock,
  title: 'Emails/EmailBlock'
};

export default meta;

type Story = StoryObj<typeof EmailBlock>;

export const Default: Story = {};
Default.args = {
  name: 'Name of Email',
  description: 'Description text'
};

export const Editable: Story = {};
Editable.args = {
  ...Default.args,
  editable: true
};

export const TestEmailDisabled: Story = {};
TestEmailDisabled.args = {
  ...Default.args,
  onSendTest: undefined
};

export const NoActions: Story = {};
NoActions.args = {
  ...Default.args,
  hideActions: true
};
