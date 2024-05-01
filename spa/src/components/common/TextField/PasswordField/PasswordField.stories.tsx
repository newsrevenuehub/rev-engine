import { Meta, StoryObj } from '@storybook/react';
import PasswordField from './PasswordField';

const meta: Meta<typeof PasswordField> = {
  component: PasswordField,
  title: 'TextField/PasswordField'
};

export default meta;

type Story = StoryObj<typeof PasswordField>;

export const Default: Story = {};
Default.args = {
  label: 'Password'
};
