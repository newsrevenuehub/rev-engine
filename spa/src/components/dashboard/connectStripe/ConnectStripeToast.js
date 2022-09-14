import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';

import * as S from './ConnectStripeToast.styled';

// Assets
import StripeLogo from 'assets/icons/stripeLogo.svg';
import Triangle6Dots from 'assets/icons/triangle6Dots.svg';
import RemoveIcon from '@material-ui/icons/Remove';
import RETooltip from 'elements/RETooltip';

const ConnectStripeToast = ({ revenueProgramId, createStripeAccountLinkMutation }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleCollapse = useCallback(() => {
    setCollapsed(true);
  }, [setCollapsed]);

  const handleExpand = useCallback(() => {
    setCollapsed(false);
  }, [setCollapsed]);

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
      <S.Description>
        Ready to publish your first donation page? Publish by creating and connect to Stripe in one easy step.
      </S.Description>
      <S.Button
        disabled={createStripeAccountLinkMutation.isLoading}
        onClick={() => createStripeAccountLinkMutation.mutate(revenueProgramId)}
      >
        Connect Now
      </S.Button>
    </S.ConnectStripeToast>
  );
};

ConnectStripeToast.propTypes = {
  createStripeAccountLinkMutation: PropTypes.object.isRequired,
  revenueProgramId: PropTypes.number.isRequired
};

export default ConnectStripeToast;
