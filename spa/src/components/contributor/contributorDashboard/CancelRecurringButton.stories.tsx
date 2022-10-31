import { ComponentMeta, ComponentStory } from '@storybook/react';
import CancelRecurringButton from './CancelRecurringButton';

export default {
  component: CancelRecurringButton,
  title: 'Contributor Dashboard/CancelRecurringButton'
} as ComponentMeta<typeof CancelRecurringButton>;

const Template: ComponentStory<typeof CancelRecurringButton> = (props) => <CancelRecurringButton {...props} />;

export const Default = Template.bind({});
Default.args = {
  contribution: {
    id: 'mock-id',
    amount: 12345,
    card_brand: 'visa',
    contributor: 123,
    contributor_email: 'someone@fundjournalism.org',
    created: '',
    currency: 'usd',
    interval: 'month',
    last4: 1234,
    modified: '',
    organization: 123,
    payment_provider_used: 'stripe',
    payment_provider_data: {},
    revenue_program: 'mock-rp-slug',
    reason: 'mock-reason-for-contribution',
    status: 'paid'
  }
};
