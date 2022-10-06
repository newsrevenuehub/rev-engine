import { useCallback } from 'react';

import * as S from './ConnectStripeElements.styled';
import ConnectStripeToast from './ConnectStripeToast';

// Assets
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import StripeLogo from 'assets/icons/stripeLogo.svg';

import useModal from 'hooks/useModal';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';

import Cookies from 'universal-cookie';

import { CONNECT_STRIPE_COOKIE_NAME, CONNECT_STRIPE_FAQ_LINK } from 'constants/textConstants';

const ConnectStripeModal = () => {
  const { open, handleClose } = useModal(true);
  const { loading, sendUserToStripe } = useConnectStripeAccount();

  const handleClickConnectLater = useCallback(() => {
    const cookies = new Cookies();
    handleClose();
    cookies.set(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
  }, [handleClose]);

  const handleClickConnectNow = useCallback(() => {
    const cookies = new Cookies();
    cookies.set(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
    sendUserToStripe();
  }, [sendUserToStripe]);

  if (!open) return <ConnectStripeToast />;
  return (
    <S.Modal open={open} aria-labelledby="Connect Stripe Modal">
      <S.ConnectStripeModal data-testid="connect-stripe-modal">
        <S.StripeLogo src={StripeLogo} />
        <S.h1>Connect to Stripe</S.h1>
        <S.Description>
          Start receiving payments by creating a Stripe account and connecting in one easy step.
          <S.Bold>Need more help connecting?</S.Bold>
          Check out our{' '}
          <S.StripeFAQ href={CONNECT_STRIPE_FAQ_LINK} target="_blank">
            Stripe Connection FAQ
          </S.StripeFAQ>
          .
        </S.Description>
        <S.Button data-testid="connect-stripe-modal-button" disabled={loading} onClick={handleClickConnectNow}>
          Connect to Stripe
        </S.Button>
        <S.Anchor onClick={handleClickConnectLater}>
          <span>I’ll connect to Stripe later</span>
          <ChevronRightIcon />
        </S.Anchor>
      </S.ConnectStripeModal>
    </S.Modal>
  );
};

// TODO: [DEV-2401] Handle partially complete Stripe Account Link states
const ConnectStripeElements = () => {
  const cookies = new Cookies();
  if (cookies.get(CONNECT_STRIPE_COOKIE_NAME)) {
    return <ConnectStripeToast />;
  }

  return <ConnectStripeModal />;
};

export default ConnectStripeElements;
