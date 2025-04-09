import { Meta, StoryObj } from '@storybook/react';
import BillingDetails, { BillingDetailsProps } from './BillingDetails';

const BillingDetailsDemo = (props: BillingDetailsProps) => <BillingDetails {...props} />;

const meta: Meta<typeof BillingDetailsDemo> = {
  component: BillingDetailsDemo,
  title: 'Contributor/BillingDetails'
};

export default meta;

type Story = StoryObj<typeof BillingDetailsDemo>;

export const Default: Story = {};
Default.args = {
  contribution: {
    amount: 12345,
    first_payment_date: new Date('1/1/2001').toISOString(),
    interval: 'one_time',
    paid_fees: true
  } as any
};

export const NoFirstPaymentDate: Story = {};
NoFirstPaymentDate.args = {
  contribution: {
    amount: 12345,
    first_payment_date: null,
    interval: 'one_time',
    paid_fees: true
  } as any
};

export const IsEditable: Story = {};
IsEditable.args = {
  enableEditMode: true,
  contribution: {
    amount: 12345,
    first_payment_date: new Date('1/1/2001').toISOString(),
    interval: 'one_time',
    paid_fees: true,
    is_modifiable: true
  } as any
};

export const InEditMode: Story = {};
InEditMode.args = {
  enableEditMode: true,
  editable: true,
  contribution: {
    amount: 12345,
    first_payment_date: new Date('1/1/2001').toISOString(),
    interval: 'one_time',
    paid_fees: true,
    is_modifiable: true
  } as any
};
