import { Meta, StoryFn } from '@storybook/react';
import EventbriteIntegrationCard from './EventbriteIntegrationCard';

export default {
  component: EventbriteIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof EventbriteIntegrationCard>;

const Template: StoryFn<typeof EventbriteIntegrationCard> = () => <EventbriteIntegrationCard />;

export const Eventbrite = Template.bind({});
