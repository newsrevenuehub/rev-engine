import GoogleAnalyticsLogo from 'assets/images/google-analytics.png';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import IntegrationCard from '../IntegrationCard';

export function GoogleAnalyticsIntegrationCard() {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={GoogleAnalyticsLogo}
      title="Google Analytics"
      isRequired={false}
      site={{
        label: 'analytics.google.com',
        url: 'https://analytics.google.com'
      }}
      description="Connect to Google Analytics to see site traffic trends to RevEngine pages."
      toggleLabel="Not Connected"
      toggleTooltipMessage="Coming soon"
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to Google Analytics. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.show_connected_to_google_analytics}
    />
  );
}

export default GoogleAnalyticsIntegrationCard;
