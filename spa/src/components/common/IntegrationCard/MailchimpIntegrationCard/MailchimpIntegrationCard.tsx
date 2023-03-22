import MailchimpLogo from 'assets/images/mailchimp.png';
import { HELP_URL } from 'constants/helperUrls';
import useConnectMailchimp from 'hooks/useConnectMailchimp';

import IntegrationCard from '../IntegrationCard';

export function MailchimpIntegrationCard() {
  const { isLoading, sendUserToMailchimp, connectedToMailchimp, organizationPlan = 'FREE' } = useConnectMailchimp();
  const freePlan = organizationPlan === 'FREE';

  return (
    <IntegrationCard
      image={MailchimpLogo}
      title="Mailchimp"
      isRequired={false}
      cornerMessage={freePlan ? 'Upgrade to Core' : undefined}
      site={{
        label: 'mailchimp.com',
        url: 'https://www.mailchimp.com'
      }}
      description="Automate your welcome series and renewal appeals with the all-in-one email platform newsrooms trust."
      disabled={freePlan || isLoading}
      toggleConnectedTooltipMessage={
        <>
          Connected to Mailchimp. Contact{' '}
          <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
            Support
          </a>{' '}
          to disconnect.
        </>
      }
      isActive={connectedToMailchimp}
      onChange={sendUserToMailchimp}
    />
  );
}

export default MailchimpIntegrationCard;
