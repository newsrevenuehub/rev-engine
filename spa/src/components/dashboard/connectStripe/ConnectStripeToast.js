import { useState, useCallback } from 'react';
import * as S from './ConnectStripeToast.styled';

import { withStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';

// Assets
import StripeLogo from 'assets/icons/stripeLogo.svg';
import Triangle6Dots from 'assets/icons/triangle6Dots.svg';
import RemoveIcon from '@material-ui/icons/Remove';

const RETooltip = withStyles({
  tooltip: {
    color: '#fff',
    backgroundColor: '#323232',
    marginTop: '4px',
    padding: '4px 6px',
    fontSize: '10px',
    borderRadius: '0.5px'
  }
})(Tooltip);

const ConnectStripeToast = () => {
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
      <S.Button>Connect Now</S.Button>
    </S.ConnectStripeToast>
  );
};

export default ConnectStripeToast;
