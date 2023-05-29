import { Fade } from '@material-ui/core';
import useContributionPageList from 'hooks/useContributionPageList';
import { DONATIONS_CORE_UPGRADE_CLOSED, useSessionState } from 'hooks/useSessionState';
import useUser from 'hooks/useUser';
import { useEffect, useState } from 'react';
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import { getUserRole } from 'utilities/getUserRole';
import DonationCoreUpgradePrompt from './DonationCoreUpgradePrompt/DonationCoreUpgradePrompt';
import { Highlight, Root } from './DonationUpgradePrompts.styled';

// This is a stopgap measure to add functionality to the Donations component in
// the non-legacy way without refactoring the entire component. Eventually, this
// probably should be merged into the main Donations component.

export function DonationUpgradePrompts() {
  const { user } = useUser();
  const { isOrgAdmin } = getUserRole(user);
  const { pages } = useContributionPageList();
  const [coreUpgradePromptClosed, setCoreUpgradePromptClosed] = useSessionState(DONATIONS_CORE_UPGRADE_CLOSED, false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showHighlight, setShowHighlight] = useState(true);

  useEffect(() => {
    if (showAnimation) {
      console.log('start delay to hide highlight');
      setTimeout(() => {
        console.log('hide highlight');
        setShowHighlight(false);
      }, 1000);
    }
  }, [showAnimation]);

  useEffect(() => {
    console.log('start delay to show animation');
    setTimeout(() => {
      console.log('show animation');
      setShowAnimation(true);
    }, 1000);
  }, []);

  // The published page check is meant to prevent the prompt from conflicting
  // with the banners that <Donations> may show.
  if (
    pages &&
    pages.some((page) => pageIsPublished(page)) &&
    !coreUpgradePromptClosed &&
    isOrgAdmin &&
    user?.organizations[0].plan.name === 'FREE' &&
    user?.revenue_programs[0].payment_provider_stripe_verified
  ) {
    return (
      <Fade in={showAnimation} timeout={1000} data-testid={`show-animation-${showAnimation}`}>
        <Root>
          <Fade in={showHighlight} timeout={500} data-testid={`prompt-highlight-${showHighlight}`}>
            <Highlight />
          </Fade>
          <DonationCoreUpgradePrompt onClose={() => setCoreUpgradePromptClosed(true)} />
        </Root>
      </Fade>
    );
  }

  return null;
}

export default DonationUpgradePrompts;
