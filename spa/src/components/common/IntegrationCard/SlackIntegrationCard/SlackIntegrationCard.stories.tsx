import { Meta, StoryFn } from '@storybook/react';
import SlackIntegrationCard from './SlackIntegrationCard';

export default {
  component: SlackIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof SlackIntegrationCard>;

const Template: StoryFn<typeof SlackIntegrationCard> = () => <SlackIntegrationCard />;

export const Slack = Template.bind({});
