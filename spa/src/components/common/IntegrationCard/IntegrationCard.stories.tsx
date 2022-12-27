import { ComponentMeta, ComponentStory } from '@storybook/react';
import INTEGRATION_TYPES from './constants';

import IntegrationCard from './IntegrationCard';

export default {
  title: 'Common/IntegrationCard',
  component: IntegrationCard
} as ComponentMeta<typeof IntegrationCard>;

export const Stripe: ComponentStory<typeof IntegrationCard> = (args) => <IntegrationCard {...args} />;

Stripe.args = { ...INTEGRATION_TYPES.STRIPE };

export const StripeActive: ComponentStory<typeof IntegrationCard> = (args) => <IntegrationCard {...args} />;

StripeActive.args = { ...INTEGRATION_TYPES.STRIPE, isActive: true };

export const Slack: ComponentStory<typeof IntegrationCard> = (args) => <IntegrationCard {...args} />;

Slack.args = { ...INTEGRATION_TYPES.SLACK };

export const Mailchimp: ComponentStory<typeof IntegrationCard> = (args) => <IntegrationCard {...args} />;

Mailchimp.args = { ...INTEGRATION_TYPES.MAILCHIMP };

export const Salesforce: ComponentStory<typeof IntegrationCard> = (args) => <IntegrationCard {...args} />;

Salesforce.args = { ...INTEGRATION_TYPES.SALESFORCE };
