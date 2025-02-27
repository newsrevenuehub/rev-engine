import DigestbuilderLogo from 'assets/images/digestbuilder.png';
import EventbriteLogo from 'assets/images/eventbrite.png';
import GoogleAnalyticsLogo from 'assets/images/google-analytics.png';
import NewspackLogo from 'assets/images/newspack.png';
import SalesforceLogo from 'assets/images/salesforce.jpg';
import HeaderSection from 'components/common/HeaderSection';
import { CustomIntegrationCard } from 'components/settings/Integration/IntegrationCard/CustomIntegrationCard';
import { MailchimpIntegrationCard } from 'components/settings/Integration/IntegrationCard/MailchimpIntegrationCard';
import { SlackIntegrationCard } from 'components/settings/Integration/IntegrationCard/SlackIntegrationCard';
import { StripeIntegrationCard } from 'components/settings/Integration/IntegrationCard/StripeIntegrationCard';
import SubheaderSection from 'components/common/SubheaderSection';
import { Content, Wrapper } from './Integration.styled';

const CARD_TYPES = {
  // Keep Salesforce first, to be rendered at the top of the list
  salesforce: {
    image: SalesforceLogo,
    title: 'Salesforce',
    site: {
      label: 'salesforce.com',
      url: 'https://www.salesforce.com'
    },
    toggleLabelOverride: undefined,
    toggleTooltipMessageOverride: undefined,
    description: "Manage multi-channel customer insights with the world's #1 CRM.",
    flag: 'show_connected_to_salesforce' as const
  },
  digestbuilder: {
    image: DigestbuilderLogo,
    title: 'digestbuilder',
    site: {
      label: 'digestbuilder.com',
      url: 'https://www.digestbuilder.com'
    },
    toggleLabelOverride: undefined,
    toggleTooltipMessageOverride: undefined,
    description: 'Connect payments made from DigestBuilder to RevEngine.',
    flag: 'show_connected_to_digestbuilder' as const
  },
  eventbrite: {
    image: EventbriteLogo,
    title: 'Eventbrite',
    site: {
      label: 'eventbrite.com',
      url: 'https://www.eventbrite.com'
    },
    toggleLabelOverride: undefined,
    toggleTooltipMessageOverride: undefined,
    description: 'Sync your event data - including attendees, revenue and new email signups - to Salesforce.',
    flag: 'show_connected_to_eventbrite' as const
  },
  newspack: {
    image: NewspackLogo,
    title: 'Newspack',
    site: {
      label: 'newspack.com',
      url: 'https://www.newspack.com'
    },
    toggleLabelOverride: undefined,
    toggleTooltipMessageOverride: undefined,
    description: 'Embed and create calls-to-actions within your Newspack-supported CMS to point to RevEngine pages.',
    flag: 'show_connected_to_newspack' as const
  },
  ga: {
    image: GoogleAnalyticsLogo,
    title: 'Google Analytics',
    site: {
      label: 'analytics.google.com',
      url: 'https://analytics.google.com'
    },
    toggleLabelOverride: 'Not Connected',
    toggleTooltipMessageOverride: 'Coming soon',
    description: 'Connect to Google Analytics to see site traffic trends to RevEngine pages.',
    flag: 'show_connected_to_google_analytics' as const
  }
};

const Integration = () => {
  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Integrations" subtitle="Connect News Revenue Engine to the tools you use every day." />
      <Content>
        <StripeIntegrationCard />
        <SlackIntegrationCard />
        <MailchimpIntegrationCard />
      </Content>
      <SubheaderSection title="Custom Features" subtitle="Contact Support to enable custom integrations." />
      <Content>
        {Object.entries(CARD_TYPES).map(([type, card]) => (
          <CustomIntegrationCard key={type} {...card} />
        ))}
      </Content>
    </Wrapper>
  );
};

export default Integration;
