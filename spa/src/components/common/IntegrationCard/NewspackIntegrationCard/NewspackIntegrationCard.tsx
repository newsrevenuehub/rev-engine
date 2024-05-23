import NewspackLogo from 'assets/images/newspack.png';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import IntegrationCard from '../IntegrationCard';

export function NewspackIntegrationCard() {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={NewspackLogo}
      title="Newspack"
      isRequired={false}
      site={{
        label: 'newspack.com',
        url: 'https://www.newspack.com'
      }}
      description="Embed and create calls-to-actions within your Newspack-supported CMS to point to RevEngine pages."
      toggleLabel={
        <>
          Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to Connect
        </>
      }
      toggleTooltipMessage="Contact our Support Staff to integrate with Newspack"
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to Newspack. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.show_connected_to_newspack}
    />
  );
}

export default NewspackIntegrationCard;
