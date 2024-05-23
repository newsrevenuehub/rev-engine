import { Meta, StoryFn } from '@storybook/react';
import GoogleAnalyticsIntegrationCard from './GoogleAnalyticsIntegrationCard';

export default {
  component: GoogleAnalyticsIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof GoogleAnalyticsIntegrationCard>;

const Template: StoryFn<typeof GoogleAnalyticsIntegrationCard> = () => <GoogleAnalyticsIntegrationCard />;

export const GoogleAnalytics = Template.bind({});
