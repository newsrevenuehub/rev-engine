import { ComponentMeta, ComponentStory } from '@storybook/react';

import StripeLogo from 'assets/images/stripe.png';
import IntegrationCard from './IntegrationCard';

export default {
  title: 'Settings/IntegrationCard',
  component: IntegrationCard
} as ComponentMeta<typeof IntegrationCard>;

export const StripeInactive: ComponentStory<typeof IntegrationCard> = (args) => <IntegrationCard {...args} />;

StripeInactive.args = {
  image: StripeLogo,
  title: 'Stripe',
  isRequired: true,
  site: {
    label: 'stripe.com',
    url: 'https://www.stripe.com'
  },
  description: 'A simple way to accept payments online.',
  disabled: false,
  toggleConnectedTooltipMessage: (
    <>
      Connected to Stripe. Contact{' '}
      <a href="HELP_URL" style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
        Support
      </a>{' '}
      to disconnect.
    </>
  )
};
