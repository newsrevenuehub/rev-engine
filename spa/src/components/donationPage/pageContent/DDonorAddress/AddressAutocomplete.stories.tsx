import { Meta, StoryObj } from '@storybook/react';
import AddressAutocomplete from './AddressAutocomplete';

const meta: Meta<typeof AddressAutocomplete> = {
  component: AddressAutocomplete,
  title: 'Donation Page/AddressAutocomplete'
};

export default meta;

type Story = StoryObj<typeof AddressAutocomplete>;

export const Default: Story = {};
Default.args = {
  label: 'Address'
};
