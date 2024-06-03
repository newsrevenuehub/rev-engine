import DigestbuilderLogo from 'assets/images/digestbuilder.png';
import EventbriteLogo from 'assets/images/eventbrite.png';
import GoogleAnalyticsLogo from 'assets/images/google-analytics.png';
import NewspackLogo from 'assets/images/newspack.png';
import SalesforceLogo from 'assets/images/salesforce.jpg';
import { Link } from 'components/base';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import PropTypes, { InferProps } from 'prop-types';
import IntegrationCard from '../IntegrationCard';

export interface CustomIntegrationCardProps extends InferProps<typeof CustomIntegrationCardPropTypes> {
  type: 'digestbuilder' | 'eventbrite' | 'newspack' | 'ga' | 'salesforce';
}

export const CARD_TYPES = {
  digestbuilder: {
    image: DigestbuilderLogo,
    title: 'digestbuilder',
    site: {
      label: 'digestbuilder.com',
      url: 'https://www.digestbuilder.com'
    },
    toggleLabel: undefined,
    toggleTooltipMessage: undefined,
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
    toggleLabel: undefined,
    toggleTooltipMessage: undefined,
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
    toggleLabel: undefined,
    toggleTooltipMessage: undefined,
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
    toggleLabel: 'Not Connected',
    toggleTooltipMessage: 'Coming soon',
    description: 'Connect to Google Analytics to see site traffic trends to RevEngine pages.',
    flag: 'show_connected_to_google_analytics' as const
  },
  salesforce: {
    image: SalesforceLogo,
    title: 'Salesforce',
    site: {
      label: 'salesforce.com',
      url: 'https://www.salesforce.com'
    },
    toggleLabel: undefined,
    toggleTooltipMessage: undefined,
    description: "Manage multi-channel customer insights with the world's #1 CRM.",
    flag: 'show_connected_to_salesforce' as const
  }
};

export function CustomIntegrationCard({ type }: CustomIntegrationCardProps) {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  const cardType = CARD_TYPES[type];

  return (
    <IntegrationCard
      image={cardType.image}
      title={cardType.title}
      isRequired={false}
      site={cardType.site}
      description={cardType.description}
      toggleLabel={
        cardType?.toggleLabel ?? (
          <>
            Contact{' '}
            <Link href={HELP_URL} target="_blank">
              Support
            </Link>{' '}
            to Connect
          </>
        )
      }
      toggleTooltipMessage={
        cardType?.toggleTooltipMessage ?? `Contact our Support Staff to integrate with ${cardType.title}`
      }
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to {cardType.title}. Contact{' '}
          <Link href={HELP_URL} target="_blank">
            Support
          </Link>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.[cardType.flag]}
    />
  );
}

const CustomIntegrationCardPropTypes = {
  type: PropTypes.oneOf(['digestbuilder', 'eventbrite', 'newspack', 'ga', 'salesforce']).isRequired
};

CustomIntegrationCard.propTypes = CustomIntegrationCardPropTypes;

export default CustomIntegrationCard;
