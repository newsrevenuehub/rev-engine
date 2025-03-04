import { Meta, StoryFn } from '@storybook/react';
import DigestbuilderLogo from 'assets/images/digestbuilder.png';
import EventbriteLogo from 'assets/images/eventbrite.png';
import GoogleAnalyticsLogo from 'assets/images/google-analytics.png';
import NewspackLogo from 'assets/images/newspack.png';
import SalesforceLogo from 'assets/images/salesforce.jpg';
import CustomIntegrationCard from './CustomIntegrationCard';

export default {
  component: CustomIntegrationCard,
  title: 'Settings/IntegrationCard'
} as Meta<typeof CustomIntegrationCard>;

const Template: StoryFn<typeof CustomIntegrationCard> = (props) => <CustomIntegrationCard {...props} />;

export const DigestBuilder = Template.bind({});
DigestBuilder.args = {
  image: DigestbuilderLogo,
  title: 'digestbuilder',
  site: {
    label: 'digestbuilder.com',
    url: 'https://www.digestbuilder.com'
  },
  toggleLabelOverride: undefined,
  toggleTooltipMessageOverride: undefined,
  description: 'Connect payments made from DigestBuilder to RevEngine.',
  flag: 'show_connected_to_digestbuilder'
};

export const Eventbrite = Template.bind({});
Eventbrite.args = {
  image: EventbriteLogo,
  title: 'Eventbrite',
  site: {
    label: 'eventbrite.com',
    url: 'https://www.eventbrite.com'
  },
  toggleLabelOverride: undefined,
  toggleTooltipMessageOverride: undefined,
  description: 'Sync your event data - including attendees, revenue and new email signups - to Salesforce.',
  flag: 'show_connected_to_eventbrite'
};

export const Newspack = Template.bind({});
Newspack.args = {
  image: NewspackLogo,
  title: 'Newspack',
  site: {
    label: 'newspack.com',
    url: 'https://www.newspack.com'
  },
  toggleLabelOverride: undefined,
  toggleTooltipMessageOverride: undefined,
  description: 'Embed and create calls-to-actions within your Newspack-supported CMS to point to RevEngine pages.',
  flag: 'show_connected_to_newspack'
};

export const GoogleAnalytics = Template.bind({});
GoogleAnalytics.args = {
  image: GoogleAnalyticsLogo,
  title: 'Google Analytics',
  site: {
    label: 'analytics.google.com',
    url: 'https://analytics.google.com'
  },
  toggleLabelOverride: 'Not Connected',
  toggleTooltipMessageOverride: 'Coming soon',
  description: 'Connect to Google Analytics to see site traffic trends to RevEngine pages.',
  flag: 'show_connected_to_google_analytics'
};

export const Salesforce = Template.bind({});
Salesforce.args = {
  image: SalesforceLogo,
  title: 'Salesforce',
  site: {
    label: 'salesforce.com',
    url: 'https://www.salesforce.com'
  },
  toggleLabelOverride: undefined,
  toggleTooltipMessageOverride: undefined,
  description: "Manage multi-channel customer insights with the world's #1 CRM.",
  flag: 'show_connected_to_salesforce'
};
