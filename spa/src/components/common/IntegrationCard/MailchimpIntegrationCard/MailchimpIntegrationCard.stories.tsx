import { Meta, StoryFn } from '@storybook/react';
import MailchimpIntegrationCard from './MailchimpIntegrationCard';

export default {
  component: MailchimpIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof MailchimpIntegrationCard>;

const Template: StoryFn<typeof MailchimpIntegrationCard> = () => <MailchimpIntegrationCard />;

export const Mailchimp = Template.bind({});
