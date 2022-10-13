import { useState, useCallback, useEffect } from 'react';

import * as S from './ConnectStripeToast.styled';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';

// Assets
import StripeLogo from 'assets/icons/stripeLogo.svg';
import Triangle6Dots from 'assets/icons/triangle6Dots.svg';
import RemoveIcon from '@material-ui/icons/Remove';
import RETooltip from 'elements/RETooltip';

export const PENDING_VERIFICATION_MESSAGE =
  "Your account verification is pending with Stripe. This can take up to 24 hours. Check back later, and we'll let you know if Stripe needs more info to proceed.";

export const USER_ACTION_REQUIRED_MESSAGE =
  'Ready to publish your first donation page? Stripe needs additional info from you to configure your account.';

export const DEFAULT_HEADING_TEXT = 'Connect to Stripe';
export const PENDING_VERIFICATION_HEADING_TEXT = 'Pending Verification';
export const USER_ACTION_REQUIRED_HEADING_TEXT = 'More Information Needed';

const ConnectStripeToast = () => {
  const { loading, sendUserToStripe, unverifiedReason, stripeConnectStarted } = useConnectStripeAccount();

  const [reason, setReason] = useState();
  const [collapsed, setCollapsed] = useState(false);
  const [headingText, setHeadingText] = useState(DEFAULT_HEADING_TEXT);
  const [ctaDescriptionText, setCtaDescriptionText] = useState(USER_ACTION_REQUIRED_MESSAGE);
  const ctaButtonText = 'Take me to Stripe';

  useEffect(() => {
    setCtaDescriptionText(
      unverifiedReason === 'pending_verification' ? PENDING_VERIFICATION_MESSAGE : USER_ACTION_REQUIRED_MESSAGE
    );
  }, [unverifiedReason]);

  useEffect(() => {
    let headingText = DEFAULT_HEADING_TEXT;
    if (stripeConnectStarted && unverifiedReason === 'past_due') {
      headingText = USER_ACTION_REQUIRED_HEADING_TEXT;
    } else if (stripeConnectStarted && unverifiedReason === 'pending_verification') {
      headingText = PENDING_VERIFICATION_HEADING_TEXT;
    }
    setHeadingText(headingText);
  }, [stripeConnectStarted, unverifiedReason]);

  const handleCollapse = useCallback(() => {
    setCollapsed(true);
  }, [setCollapsed]);

  const handleExpand = useCallback(() => {
    setCollapsed(false);
  }, [setCollapsed]);

  // This causes the toast to automatically open if unverifiedReason
  // changes and it's `past_due`, which requires user action
  useEffect(() => {
    if (unverifiedReason === 'past_due' && reason !== 'past_due') {
      setCollapsed(false);
    }
    setReason(unverifiedReason);
  }, [reason, unverifiedReason]);

  if (collapsed) {
    return (
      <RETooltip title={headingText}>
        <S.ConnectStripeToastCollapsed data-testid="connect-stripe-toast-collapsed" onClick={handleExpand}>
          <S.StripeLogoCollapsed src={StripeLogo} />
          <span>
            <S.BottomLeftImage src={Triangle6Dots} />
          </span>
        </S.ConnectStripeToastCollapsed>
      </RETooltip>
    );
  }

  return (
    <S.ConnectStripeToast data-testid="connect-stripe-toast">
      <S.Header>
        <S.StripeLogo src={StripeLogo} />
        <RETooltip title="Minimize" placement="bottom-end">
          <S.Minimize onClick={handleCollapse} data-testid="minimize-toast">
            <RemoveIcon />
          </S.Minimize>
        </RETooltip>
      </S.Header>
      <S.Heading>{headingText}</S.Heading>
      <S.Description>{ctaDescriptionText}</S.Description>
      <S.Button
        data-testid="connect-stripe-toast-button"
        // if reason is `past_due` then there's work to be done off-site
        // with Stripe. In that case, we enable this button, but otherwise,
        // we disable (or if loading)
        disabled={loading || unverifiedReason !== 'past_due'}
        onClick={sendUserToStripe}
      >
        {ctaButtonText}
      </S.Button>
    </S.ConnectStripeToast>
  );
};

export default ConnectStripeToast;
