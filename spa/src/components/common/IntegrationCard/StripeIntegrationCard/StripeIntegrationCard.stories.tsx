import { Meta, StoryFn } from '@storybook/react';
import StripeIntegrationCard from './StripeIntegrationCard';

export default {
  component: StripeIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof StripeIntegrationCard>;

const Template: StoryFn<typeof StripeIntegrationCard> = () => <StripeIntegrationCard />;

export const Stripe = Template.bind({});
