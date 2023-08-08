import MailchimpLogo from 'assets/images/mailchimp.png';
import { HELP_URL } from 'constants/helperUrls';
import useConnectMailchimp from 'hooks/useConnectMailchimp';

import IntegrationCard from '../IntegrationCard';
import { CornerMessage } from './MailchimpIntegrationCard.styled';
import useModal from 'hooks/useModal';
import MailchimpModal from './MailchimpModal';
import { PLAN_LABELS } from 'constants/orgPlanConstants';
import useUser from 'hooks/useUser';

export function MailchimpIntegrationCard() {
  const { user } = useUser();
  const { open, handleToggle } = useModal();
  const {
    isLoading,
    sendUserToMailchimp,
    connectedToMailchimp,
    organizationPlan = 'FREE',
    hasMailchimpAccess
  } = useConnectMailchimp();

  const mailchimpHeaderData = {
    isActive: connectedToMailchimp,
    isRequired: false,
    cornerMessage: !isLoading && organizationPlan === PLAN_LABELS.FREE && (
      <CornerMessage>Upgrade to Core</CornerMessage>
    ),
    title: 'Mailchimp',
    image: MailchimpLogo,
    site: {
      label: 'mailchimp.com',
      url: 'https://www.mailchimp.com'
    }
  };

  return (
    <>
      <IntegrationCard
        {...mailchimpHeaderData}
        description="Create custom segments and automations based on contributor data with the email platform newsrooms trust."
        onViewDetails={hasMailchimpAccess ? handleToggle : undefined}
        onChange={sendUserToMailchimp}
        disabled={sendUserToMailchimp === undefined || isLoading}
        toggleConnectedTooltipMessage={
          <>
            Connected to Mailchimp. Contact{' '}
            <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
              Support
            </a>{' '}
            to disconnect.
          </>
        }
      />
      {open && user && (
        <MailchimpModal
          open={open}
          onClose={handleToggle}
          organizationPlan={organizationPlan}
          sendUserToMailchimp={sendUserToMailchimp}
          user={user}
          {...mailchimpHeaderData}
        />
      )}
    </>
  );
}

export default MailchimpIntegrationCard;
