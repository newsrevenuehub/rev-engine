import { Meta, StoryFn } from '@storybook/react';
import CancelRecurringButton from './CancelRecurringButton';

export default {
  component: CancelRecurringButton,
  title: 'Contributor/CancelRecurringButton'
} as Meta<typeof CancelRecurringButton>;

const Template: StoryFn<typeof CancelRecurringButton> = (props) => <CancelRecurringButton {...props} />;

export const Default = Template.bind({});
Default.args = {
  contribution: {
    id: 'mock-id',
    amount: 12345,
    card_brand: 'visa',
    created: '',
    credit_card_expiration_date: 'mock-cc-expiration-date',
    interval: 'month',
    is_cancelable: true,
    is_modifiable: true,
    last_payment_date: 'mock-last-payment-date',
    last4: 1234,
    payment_type: 'mock-payment-type',
    provider_customer_id: 'mock-customer-id',
    revenue_program: 'mock-rp-slug',
    status: 'paid',
    stripe_account_id: 'mock-account-id'
  }
};
