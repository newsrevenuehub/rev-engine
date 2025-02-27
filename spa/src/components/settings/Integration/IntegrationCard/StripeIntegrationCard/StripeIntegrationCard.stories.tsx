import { ComponentMeta, ComponentStory } from '@storybook/react';
import StripeIntegrationCard from './StripeIntegrationCard';

export default {
  component: StripeIntegrationCard,
  title: 'Common/IntegrationCard'
} as ComponentMeta<typeof StripeIntegrationCard>;

const Template: ComponentStory<typeof StripeIntegrationCard> = () => <StripeIntegrationCard />;

export const Stripe = Template.bind({});
