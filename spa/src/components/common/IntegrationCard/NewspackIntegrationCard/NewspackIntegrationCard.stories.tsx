import { Meta, StoryFn } from '@storybook/react';
import NewspackIntegrationCard from './NewspackIntegrationCard';

export default {
  component: NewspackIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof NewspackIntegrationCard>;

const Template: StoryFn<typeof NewspackIntegrationCard> = () => <NewspackIntegrationCard />;

export const Newspack = Template.bind({});
