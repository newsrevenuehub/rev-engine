import MailchimpLogo from 'assets/images/mailchimp.png';
import { CORE_UPGRADE_URL, HELP_URL } from 'constants/helperUrls';
import useConnectMailchimp from 'hooks/useConnectMailchimp';

import { PLAN_NAMES } from 'constants/orgPlanConstants';
import useModal from 'hooks/useModal';
import IntegrationCard from '../IntegrationCard';
import MailchimpModal from './MailchimpModal';
import useUser from 'hooks/useUser';
import FeatureBadge from 'components/common/Badge/FeatureBadge/FeatureBadge';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import { CornerMessage } from '../IntegrationCard.styled';
import { ButtonProps, RouterLinkButton, RouterLinkButtonProps } from 'components/base';
import { ActionButton } from './MailchimpModal/MailchimpModal.styled';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { SETTINGS } from 'routes';

export function MailchimpIntegrationCard() {
  const { user } = useUser();
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
    cornerMessage: showUpgradePrompt && (
      <CornerMessage>
        <FeatureBadge type="CORE" />
      </CornerMessage>
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
        {...(showUpgradePrompt &&
          user && {
            rightAction: flagIsActiveForUser(SELF_UPGRADE_ACCESS_FLAG_NAME, user) ? (
              <RouterLinkButton {...actionButtonProps} to={SETTINGS.SUBSCRIPTION}>
                Upgrade
              </RouterLinkButton>
            ) : (
              <ActionButton {...actionButtonProps} href={CORE_UPGRADE_URL}>
                Upgrade
              </ActionButton>
            )
          })}
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
