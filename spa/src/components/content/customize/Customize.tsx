import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Link } from 'components/base';
import Hero from 'components/common/Hero';
import SendTestEmail from 'components/common/SendTestEmail';
import { CustomizeContent, SectionWrapper, WideMargin } from 'components/content/pages/Pages.styled';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { CORE_UPGRADE_URL, HELP_URL } from 'constants/helperUrls';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { GlobalLoading } from 'components/common/GlobalLoading';
import { CUSTOMIZE_CORE_UPGRADE_CLOSED, useSessionState } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import { SETTINGS } from 'routes';
import { getUserRole } from 'utilities/getUserRole';
import { ComingSoon } from './ComingSoon';
import { CustomizeCoreUpgradePrompt } from './CustomizeCoreUpgradePrompt';

const LooseLink = Link as any;

export const PAID_SUBTITLE =
  'Create branding elements to customize checkout pages, receipt emails, and more. Make adjustments directly in the page editor for special campaigns.';

function Customize() {
  const { user, isLoading: userLoading } = useUser();
  const { isOrgAdmin } = getUserRole(user);
  const isFreeOrg = user?.organizations?.[0]?.plan?.name === PLAN_NAMES.FREE;
  const hasSendReceiptEmailViaNRE = user?.organizations?.[0]?.send_receipt_email_via_nre;

  const [coreUpgradePromptClosed, setCoreUpgradePromptClosed] = useSessionState(CUSTOMIZE_CORE_UPGRADE_CLOSED, false);
  const showCoreUpgradePrompt =
    !coreUpgradePromptClosed && isOrgAdmin && isFreeOrg && user?.revenue_programs[0].payment_provider_stripe_verified;

  const emailDescription = useMemo(() => {
    if (!hasSendReceiptEmailViaNRE) {
      return (
        <>
          You’re not using RevEngine to send receipts. To start using RevEngine receipts, contact{' '}
          <Link href={HELP_URL} target="_blank">
            Support
          </Link>
          . Send a test email to see our receipts!
        </>
      );
    }

    if (isFreeOrg) {
      return (
        <>
          RevEngine will automatically send email receipts to your contributors. To use your logo and branding for email
          receipts,{' '}
          <Link href={CORE_UPGRADE_URL} target="_blank">
            upgrade to Core!
          </Link>
        </>
      );
    }

    return (
      <>
        We’ll use your brand elements and default contribution page to style receipts, payment reminders, and
        contributor portal emails. For marketing and engagement emails, check out{' '}
        <LooseLink component={RouterLink} to={SETTINGS.INTEGRATIONS}>
          email automation integrations.
        </LooseLink>
      </>
    );
  }, [hasSendReceiptEmailViaNRE, isFreeOrg]);

  if (userLoading) return <GlobalLoading />;

  if (!user) {
    // Should never happen
    throw Error('User is undefined');
  }

  return (
    <GenericErrorBoundary>
      <Hero title="Customize" subtitle={isFreeOrg ? '' : PAID_SUBTITLE} />
      {showCoreUpgradePrompt && <CustomizeCoreUpgradePrompt onClose={() => setCoreUpgradePromptClosed(true)} />}
      <CustomizeContent>
        <SectionWrapper>
          <SendTestEmail description={emailDescription} rpId={user.revenue_programs[0].id} editable={!isFreeOrg} />
        </SectionWrapper>
        {!isFreeOrg && (
          <WideMargin>
            <ComingSoon />
          </WideMargin>
        )}
      </CustomizeContent>
    </GenericErrorBoundary>
  );
}

export default Customize;
