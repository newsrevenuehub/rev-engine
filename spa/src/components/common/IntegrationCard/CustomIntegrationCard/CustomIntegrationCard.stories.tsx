import { Meta, StoryFn } from '@storybook/react';
import CustomIntegrationCard from './CustomIntegrationCard';

export default {
  component: CustomIntegrationCard,
  title: 'Common/IntegrationCard'
} as Meta<typeof CustomIntegrationCard>;

const Template: StoryFn<typeof CustomIntegrationCard> = (props) => <CustomIntegrationCard {...props} />;

export const DigestBuilder = Template.bind({});
DigestBuilder.args = {
  type: 'digestbuilder'
};

export const Eventbrite = Template.bind({});
Eventbrite.args = {
  type: 'eventbrite'
};

export const Newspack = Template.bind({});
Newspack.args = {
  type: 'newspack'
};

export const GoogleAnalytics = Template.bind({});
GoogleAnalytics.args = {
  type: 'ga'
};

export const Salesforce = Template.bind({});
Salesforce.args = {
  type: 'salesforce'
};
