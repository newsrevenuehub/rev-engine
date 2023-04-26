import MailchimpLogo from 'assets/images/mailchimp.png';
import { HELP_URL } from 'constants/helperUrls';
import useConnectMailchimp from 'hooks/useConnectMailchimp';

import IntegrationCard from '../IntegrationCard';
import { CornerMessage } from './MailchimpIntegrationCard.styled';

export function MailchimpIntegrationCard() {
  const { isLoading, sendUserToMailchimp, connectedToMailchimp, organizationPlan = 'FREE' } = useConnectMailchimp();
  const freePlan = organizationPlan === 'FREE';

  return (
    <IntegrationCard
      image={MailchimpLogo}
      title="Mailchimp"
      isRequired={false}
      cornerMessage={!isLoading && freePlan && <CornerMessage>Upgrade to Core</CornerMessage>}
      site={{
        label: 'mailchimp.com',
        url: 'https://www.mailchimp.com'
      }}
      description="Create custom segments and automations based on contributor data with the email platform newsrooms trust."
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
