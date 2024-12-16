import { Meta, StoryFn } from '@storybook/react';
import { ContributorContribution } from 'hooks/useContributorContributionList';
import ContributionPaymentMethod from './ContributionPaymentMethod';

export default {
  component: ContributionPaymentMethod,
  title: 'Contributor/ContributionPaymentMethod'
} as Meta<typeof ContributionPaymentMethod>;

const testContribution: ContributorContribution = {
  amount: 123,
  card_brand: 'visa',
  created: 'mock-created-date',
  credit_card_expiration_date: '12/34',
  id: 'mock-id',
  interval: 'one_time',
  is_cancelable: false,
  is_modifiable: false,
  last4: 1234,
  last_payment_date: 'mock-last-payment-date',
  payment_type: 'card',
  provider_customer_id: 'mock-provider-id',
  revenue_program: 'mock-rp-slug',
  stripe_account_id: 'mock-account-id',
  status: 'paid'
};

const Template: StoryFn<typeof ContributionPaymentMethod> = (props) => <ContributionPaymentMethod {...props} />;

export const OneTime = Template.bind({});

OneTime.args = { contribution: testContribution };

export const Monthly = Template.bind({});

Monthly.args = { contribution: { ...testContribution, is_cancelable: true, is_modifiable: true, interval: 'month' } };

export const Yearly = Template.bind({});

Yearly.args = { contribution: { ...testContribution, is_cancelable: true, is_modifiable: true, interval: 'year' } };
