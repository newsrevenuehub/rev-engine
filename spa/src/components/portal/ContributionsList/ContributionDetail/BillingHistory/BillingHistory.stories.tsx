import { Meta, StoryObj } from '@storybook/react';
import BillingHistory from './BillingHistory';

const meta: Meta<typeof BillingHistory> = {
  component: BillingHistory,
  title: 'Contributor/BillingHistory'
};

export default meta;

type Story = StoryObj<typeof BillingHistory>;

export const Default: Story = {};
Default.args = {
  payments: [
    {
      amount_refunded: 0,
      created: new Date('1/1/2001').toISOString(),
      gross_amount_paid: 12345,
      net_amount_paid: 12345,
      status: 'paid'
    },
    {
      amount_refunded: 678,
      created: new Date('1/2/2001').toISOString(),
      gross_amount_paid: 678,
      net_amount_paid: 678,
      status: 'refunded'
    }
  ]
};
