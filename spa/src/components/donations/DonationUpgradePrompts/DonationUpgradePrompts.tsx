import { DONATIONS_CORE_UPGRADE_CLOSED, useSessionState } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import { getUserRole } from 'utilities/getUserRole';
import DonationCoreUpgradePrompt from './DonationCoreUpgradePrompt/DonationCoreUpgradePrompt';
import { Root } from './DonationUpgradePrompts.styled';

// This is a stopgap measure to add functionality to the Donations component in
// the non-legacy way without refactoring the entire component. Eventually, this
// probably should be merged into the main Donations component.

export function DonationUpgradePrompts() {
  const { user } = useUser();
  const { isOrgAdmin } = getUserRole(user);
  const [coreUpgradePromptClosed, setCoreUpgradePromptClosed] = useSessionState(DONATIONS_CORE_UPGRADE_CLOSED, false);

  if (
    !coreUpgradePromptClosed &&
    isOrgAdmin &&
    user?.organizations[0].plan.name === 'FREE' &&
    user?.revenue_programs[0].payment_provider_stripe_verified
  ) {
    return (
      <Root>
        <DonationCoreUpgradePrompt onClose={() => setCoreUpgradePromptClosed(true)} />
      </Root>
    );
  }

  return null;
}

export default DonationUpgradePrompts;
