import { useHistory } from 'react-router-dom';

import { Link } from 'components/base';
import Hero from 'components/common/Hero';
import SendTestEmail from 'components/common/SendTestEmail';
import { CustomizeContent, SectionWrapper, WideMargin } from 'components/content/pages/Pages.styled';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { CORE_UPGRADE_URL } from 'constants/helperUrls';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import GlobalLoading from 'elements/GlobalLoading';
import { CUSTOMIZE_CORE_UPGRADE_CLOSED, useSessionState } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import { SETTINGS } from 'routes';
import { getUserRole } from 'utilities/getUserRole';
import { CustomizeCoreUpgradePrompt } from './CustomizeCoreUpgradePrompt';
import { ComingSoon } from './ComingSoon';

export const PAID_SUBTITLE =
  'Create branding elements to customize checkout pages, receipt emails, and more. Make adjustments directly in the page editor for special campaigns.';

function Styles() {
  const { user, isLoading: userLoading } = useUser();
  const history = useHistory();
  const { isOrgAdmin } = getUserRole(user);
  const isFreeOrg = user?.organizations?.[0]?.plan?.name === PLAN_NAMES.FREE;

  const [coreUpgradePromptClosed, setCoreUpgradePromptClosed] = useSessionState(CUSTOMIZE_CORE_UPGRADE_CLOSED, false);
  const showCoreUpgradePrompt =
    !coreUpgradePromptClosed && isOrgAdmin && isFreeOrg && user?.revenue_programs[0].payment_provider_stripe_verified;

  const emailDescription = isFreeOrg ? (
    <>
      RevEngine will automatically send email receipts to your contributors. To use your logo and branding for email
      receipts,{' '}
      <Link href={CORE_UPGRADE_URL} target="_blank">
        upgrade to Core!
      </Link>
    </>
  ) : (
    <>
      We’ll use your brand elements and default contribution page to style receipts, payment reminders, and contributor
      portal emails. For marketing and engagement emails, check out{' '}
      <Link
        onClick={(e) => {
          // prevent default so that the link doesn't navigate with refresh, but instead uses react-router
          e.preventDefault();
          history.push(SETTINGS.INTEGRATIONS);
        }}
        // href is setup here so that link URL is shown in the bottom of the browser window on hover
        href={SETTINGS.INTEGRATIONS}
      >
        email automation integrations.
      </Link>
    </>
  );

  if (userLoading) return <GlobalLoading />;

  if (!user) {
    // Should never happen
    throw Error('User is undefined');
  }

  return (
    <GenericErrorBoundary>
      <Hero title="Customize" subtitle={isFreeOrg ? '' : PAID_SUBTITLE} />
      {showCoreUpgradePrompt && <CustomizeCoreUpgradePrompt onClose={() => setCoreUpgradePromptClosed(true)} />}
      <CustomizeContent data-testid="styles-list">
        <SectionWrapper>
          <SendTestEmail description={emailDescription} rpId={user.revenue_programs[0].id} />
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

export default Styles;
