import MailchimpLogo from 'assets/images/mailchimp.png';
import { HELP_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';

import IntegrationCard from '../IntegrationCard';

export function MailchimpIntegrationCard() {
  const { user } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  return (
    <IntegrationCard
      image={MailchimpLogo}
      title="Mailchimp"
      isRequired={false}
      cornerMessage="Upgrade to Core"
      site={{
        label: 'mailchimp.com',
        url: 'https://www.mailchimp.com'
      }}
      description="Automate your welcome series and renewal appeals with the all-in-one email platform newsrooms trust."
      toggleTooltipMessage="Coming Soon"
      disabled
      toggleConnectedTooltipMessage={
        <>
          Connected to Mailchimp. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={currentOrganization?.show_connected_to_mailchimp}
    />
  );
}

export default MailchimpIntegrationCard;
