import { useCallback } from 'react';
import * as S from './ConnectStripeElements.styled';
import ConnectStripeToast from './ConnectStripeToast';

// Assets
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import BottomNav from 'assets/icons/bottomNav.svg';
import StripeLogo from 'assets/icons/stripeLogo.svg';

import useModal from 'hooks/useModal';
import Cookies from 'universal-cookie';

const CONNECT_STRIPE_COOKIE_NAME = 'hideConnectStripeModal';

const ConnectStripeModal = () => {
  const { open, handleClose } = useModal(true);

  const handleModelClose = useCallback(() => {
    const cookies = new Cookies();
    handleClose();
    cookies.set(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
  }, [handleClose]);

  if (!open) return <ConnectStripeToast />;
  return (
    <S.Modal open={open} onClose={handleClose} aria-labelledby="Connect Stripe Modal">
      <S.ConnectStripeModal data-testid="connect-stripe-modal">
        <S.StripeLogo src={StripeLogo} />
        <S.h2>Connect to Stripe</S.h2>
        <S.Description>
          Start receiving payments by creating a Stripe account and connecting in one easy step.
          <S.Bold>Need more help connecting?</S.Bold>
          Check out our <S.StripeFAQ href="/">Stripe Connection FAQ</S.StripeFAQ>.
        </S.Description>
        <S.Button>Connect to Stripe</S.Button>
        <S.Anchor onClick={handleModelClose}>
          <span>I’ll connect to Stripe later</span>
          <ChevronRightIcon />
        </S.Anchor>
        <S.BottomNav src={BottomNav} />
      </S.ConnectStripeModal>
    </S.Modal>
  );
};

const ConnectStripeElements = () => {
  const cookies = new Cookies();

  if (cookies.get(CONNECT_STRIPE_COOKIE_NAME)) {
    return <ConnectStripeToast />;
  }

  return <ConnectStripeModal />;
};

export default ConnectStripeElements;
