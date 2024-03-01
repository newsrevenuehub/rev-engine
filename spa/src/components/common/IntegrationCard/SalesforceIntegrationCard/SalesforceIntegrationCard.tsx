import SalesforceLogo from 'assets/images/salesforce.jpg';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';

import IntegrationCard from '../IntegrationCard';
import FeatureBadge from 'components/common/Badge/FeatureBadge/FeatureBadge';

export function SalesforceIntegrationCard() {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={SalesforceLogo}
      title="Salesforce"
      isRequired={false}
      cornerMessage={<FeatureBadge type="CUSTOM" />}
      site={{
        label: 'salesforce.com',
        url: 'https://www.salesforce.com'
      }}
      description="Manage multi-channel customer insights with the world's #1 CRM."
      toggleLabel={
        <>
          Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to Connect
        </>
      }
      toggleTooltipMessage="Contact our Support Staff to integrate with Salesforce"
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to Salesforce. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={!!currentOrganization?.show_connected_to_salesforce}
    />
  );
}

export default SalesforceIntegrationCard;
