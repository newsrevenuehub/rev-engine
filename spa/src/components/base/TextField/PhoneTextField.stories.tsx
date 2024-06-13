import { Meta, StoryObj } from '@storybook/react';
import PhoneTextField from './PhoneTextField';

const meta: Meta<typeof PhoneTextField> = {
  component: PhoneTextField,
  title: 'Base/PhoneTextField'
};

export default meta;

type Story = StoryObj<typeof PhoneTextField>;

export const Default: Story = {};
Default.args = {
  id: 'phone-number',
  label: 'Phone Number'
};

export const ExistingNumber: Story = {};
ExistingNumber.args = {
  id: 'phone-number',
  label: 'Phone Number',
  value: '+5548988888888'
};
