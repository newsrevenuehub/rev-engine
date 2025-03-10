import MailchimpLogo from 'assets/images/mailchimp.png';
import { HELP_URL } from 'constants/helperUrls';
import useConnectMailchimp from 'hooks/useConnectMailchimp';

import { ButtonProps, Link, RouterLinkButton, RouterLinkButtonProps } from 'components/base';
import FeatureBadge from 'components/common/Badge/FeatureBadge/FeatureBadge';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import useModal from 'hooks/useModal';
import { SETTINGS } from 'routes';
import IntegrationCard from '../IntegrationCard';
import MailchimpModal from './MailchimpModal';

export function MailchimpIntegrationCard() {
  const { open, handleToggle } = useModal();
  const {
    isLoading,
    sendUserToMailchimp,
    connectedToMailchimp,
    organizationPlan = PLAN_NAMES.FREE,
    hasMailchimpAccess
  } = useConnectMailchimp();
  const actionButtonProps: Partial<ButtonProps & RouterLinkButtonProps> = {
    color: 'primaryDark',
    variant: 'contained',
    disableElevation: true
  };

  const showUpgradePrompt = !isLoading && organizationPlan === PLAN_NAMES.FREE;

  const mailchimpHeaderData = {
    isActive: connectedToMailchimp,
    isRequired: false,
    cornerMessage: showUpgradePrompt && <FeatureBadge type="CORE" />,
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
            <Link href={HELP_URL} target="_blank">
              Support
            </Link>{' '}
            to disconnect.
          </>
        }
        {...(showUpgradePrompt && {
          rightAction: (
            <RouterLinkButton {...actionButtonProps} to={SETTINGS.SUBSCRIPTION}>
              Upgrade
            </RouterLinkButton>
          )
        })}
      />
      {open && (
        <MailchimpModal
          open={open}
          onClose={handleToggle}
          organizationPlan={organizationPlan}
          sendUserToMailchimp={sendUserToMailchimp}
          {...mailchimpHeaderData}
        />
      )}
    </>
  );
}

export default MailchimpIntegrationCard;
