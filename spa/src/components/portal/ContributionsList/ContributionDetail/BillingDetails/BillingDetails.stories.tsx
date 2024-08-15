import { Meta, StoryObj } from '@storybook/react';
import BillingDetails from './BillingDetails';

const BillingDetailsDemo = (contribution: any) => <BillingDetails contribution={contribution} />;

const meta: Meta<typeof BillingDetailsDemo> = {
  component: BillingDetailsDemo,
  title: 'Contributor/BillingDetails'
};

export default meta;

type Story = StoryObj<typeof BillingDetailsDemo>;

export const Default: Story = {};
Default.args = {
  amount: 12345,
  created: new Date('1/1/2001').toISOString(),
  interval: 'one_time',
  paid_fees: true
};
