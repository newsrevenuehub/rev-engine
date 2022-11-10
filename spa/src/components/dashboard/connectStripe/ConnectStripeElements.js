import { useCallback } from 'react';
import { useCookies } from 'react-cookie';

import * as S from './ConnectStripeElements.styled';
import ConnectStripeToast from './ConnectStripeToast';

// Assets
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import StripeLogo from 'assets/icons/stripeLogo.svg';

import useModal from 'hooks/useModal';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';

import { CONNECT_STRIPE_COOKIE_NAME, CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';
import { OffscreenText } from 'components/base';
import ConnectStripeNeedHelpCta from './ConnectStripeNeedHelpCTA';

export const CONNECT_TO_STRIPE_BUTTON_CTA = 'Connect now';

const ConnectStripeModal = () => {
  const { open, handleClose } = useModal(true);
  const { isLoading, sendUserToStripe } = useConnectStripeAccount();
  const [_, setCookie] = useCookies(CONNECT_STRIPE_COOKIE_NAME);

  const handleClickConnectLater = useCallback(() => {
    handleClose();
    setCookie(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
  }, [handleClose, setCookie]);

  const handleClickConnectNow = useCallback(() => {
    setCookie(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
    sendUserToStripe();
  }, [sendUserToStripe, setCookie]);

  if (!open) return <ConnectStripeToast />;
  return (
    <S.Modal open={open} aria-labelledby="Connect Stripe Modal">
      <S.ConnectStripeModal data-testid="connect-stripe-modal">
        <OffscreenText>Step 2 of 2</OffscreenText>
        <S.StripeLogo src={StripeLogo} />
        <S.h1>Set Up Payment Processor</S.h1>
        <S.Description>
          To accept contributions, you’ll need to set up a payment processor. We use Stripe because it’s speedy and
          secure. Create and connect to a Stripe account in one easy step.
          <ConnectStripeNeedHelpCta />
        </S.Description>
        <S.Button data-testid="connect-stripe-modal-button" disabled={isLoading} onClick={handleClickConnectNow}>
          {CONNECT_TO_STRIPE_BUTTON_CTA}
        </S.Button>
        <S.Anchor onClick={handleClickConnectLater}>
          I’ll connect to Stripe later
          <ChevronRightIcon />
        </S.Anchor>
        <S.BottomStepper aria-hidden activeStep={1} steps={2} />
      </S.ConnectStripeModal>
    </S.Modal>
  );
};

const ConnectStripeElements = () => {
  const [cookies, _] = useCookies(CONNECT_STRIPE_COOKIE_NAME);

  if (cookies[CONNECT_STRIPE_COOKIE_NAME]) {
    return <ConnectStripeToast />;
  }

  return <ConnectStripeModal />;
};

export default ConnectStripeElements;
