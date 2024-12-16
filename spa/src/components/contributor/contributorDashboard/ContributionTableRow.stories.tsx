import { Meta, StoryFn } from '@storybook/react';
import { ContributorContribution } from 'hooks/useContributorContributionList';
import ContributionTableRow from './ContributionTableRow';

export default {
  component: ContributionTableRow,
  title: 'Contributor/ContributionTableRow'
} as Meta<typeof ContributionTableRow>;

const testContribution: ContributorContribution = {
  id: 'mock-id',
  amount: 12345,
  card_brand: 'visa',
  created: new Date(2022, 5, 5).toISOString(),
  credit_card_expiration_date: 'mock-cc-expiration-date',
  interval: 'one_time',
  is_cancelable: false,
  is_modifiable: false,
  last_payment_date: new Date(2022, 5, 5).toISOString(),
  last4: 1234,
  payment_type: 'mock-payment-type',
  provider_customer_id: 'mock-customer-id',
  revenue_program: 'mock-rp-slug',
  status: 'paid',
  stripe_account_id: 'mock-account-id'
};

const Template: StoryFn<typeof ContributionTableRow> = (props) => <ContributionTableRow {...props} />;

export const OneTime = Template.bind({});

OneTime.args = { contribution: testContribution };

export const Monthly = Template.bind({});

Monthly.args = { contribution: { ...testContribution, interval: 'month', is_cancelable: true, is_modifiable: true } };

export const Yearly = Template.bind({});

Yearly.args = { contribution: { ...testContribution, interval: 'year', is_cancelable: true, is_modifiable: true } };
