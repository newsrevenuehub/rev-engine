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
import { OffscreenText } from 'components/base';

const ConnectStripeModal = () => {
  const { open, handleClose } = useModal(true);
  const {
    createStripeAccountLink: { mutate, isLoading }
  } = useConnectStripeAccount();

  const handleClickConnectLater = useCallback(() => {
    const cookies = new Cookies();
    handleClose();
    cookies.set(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
  }, [handleClose]);

  if (!open) return <ConnectStripeToast />;
  return (
    <S.Modal open={open} aria-labelledby="Connect Stripe Modal">
      <S.ConnectStripeModal data-testid="connect-stripe-modal">
        <OffscreenText>Step 2 of 2</OffscreenText>
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
        <S.Button data-testid="connect-stripe-modal-button" disabled={isLoading} onClick={() => mutate()}>
          Connect to Stripe
        </S.Button>
        <S.Anchor onClick={handleClickConnectLater}>
          <span>I’ll connect to Stripe later</span>
          <ChevronRightIcon />
        </S.Anchor>
        <S.BottomStepper aria-hidden activeStep={1} steps={2} />
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
