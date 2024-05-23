import DigestbuilderLogo from 'assets/images/digestbuilder.png';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import IntegrationCard from '../IntegrationCard';

export function DigestbuilderIntegrationCard() {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={DigestbuilderLogo}
      title="digestbuilder"
      isRequired={false}
      site={{
        label: 'digestbuilder.com',
        url: 'https://www.digestbuilder.com'
      }}
      description="Connect payments made from DigestBuilder to RevEngine."
      toggleLabel={
        <>
          Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to Connect
        </>
      }
      toggleTooltipMessage="Contact our Support Staff to integrate with digestbuilder"
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to digestbuilder. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.show_connected_to_digestbuilder}
    />
  );
}

export default DigestbuilderIntegrationCard;
