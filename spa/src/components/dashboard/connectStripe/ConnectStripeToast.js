import { useState, useCallback, useEffect } from 'react';

import * as S from './ConnectStripeToast.styled';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';

// Assets
import StripeLogo from 'assets/icons/stripeLogo.svg';
import Triangle6Dots from 'assets/icons/triangle6Dots.svg';
import RemoveIcon from '@material-ui/icons/Remove';
import RETooltip from 'elements/RETooltip';

const ConnectStripeToast = () => {
  const { loading, sendUserToStripe, ctaButtonText, ctaDescriptionText, unverifiedReason } = useConnectStripeAccount();
  const [reason, setReason] = useState();
  const [collapsed, setCollapsed] = useState(false);

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
      <RETooltip title="Connect to Stripe">
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
      <S.Heading>Connect to Stripe</S.Heading>
      <S.Description>{ctaDescriptionText}</S.Description>
      {unverifiedReason === 'past_due' && (
        <S.Button data-testid="connect-stripe-toast-button" disabled={loading} onClick={sendUserToStripe}>
          {ctaButtonText}
        </S.Button>
      )}
    </S.ConnectStripeToast>
  );
};

export default ConnectStripeToast;
