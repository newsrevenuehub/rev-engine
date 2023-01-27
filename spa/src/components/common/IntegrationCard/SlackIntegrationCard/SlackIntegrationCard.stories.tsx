import { ComponentMeta, ComponentStory } from '@storybook/react';
import SlackIntegrationCard from './SlackIntegrationCard';

export default {
  component: SlackIntegrationCard,
  title: 'Common/IntegrationCard'
} as ComponentMeta<typeof SlackIntegrationCard>;

const Template: ComponentStory<typeof SlackIntegrationCard> = () => <SlackIntegrationCard />;

export const Slack = Template.bind({});
