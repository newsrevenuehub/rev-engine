import { ComponentMeta, ComponentStory } from '@storybook/react';
import MailchimpIntegrationCard from './MailchimpIntegrationCard';

export default {
  component: MailchimpIntegrationCard,
  title: 'Settings/IntegrationCard'
} as ComponentMeta<typeof MailchimpIntegrationCard>;

const Template: ComponentStory<typeof MailchimpIntegrationCard> = () => <MailchimpIntegrationCard />;

export const Mailchimp = Template.bind({});
