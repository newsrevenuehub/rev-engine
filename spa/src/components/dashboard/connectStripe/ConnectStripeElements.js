import { useCallback } from 'react';
import PropTypes from 'prop-types';

import { useMutation } from '@tanstack/react-query';
import * as S from './ConnectStripeElements.styled';
import ConnectStripeToast from './ConnectStripeToast';

// Assets
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import BottomNav from 'assets/icons/bottomNav.svg';
import StripeLogo from 'assets/icons/stripeLogo.svg';

import useModal from 'hooks/useModal';
import Cookies from 'universal-cookie';

export const CONNECT_STRIPE_COOKIE_NAME = 'hideConnectStripeModal';

// TODO: Insert Stripe FAQ Link
const CONNECT_STRIPE_FAQ_LINK = '';

const ConnectStripeModal = ({ revenueProgramId, createStripeAccountLinkMutation }) => {
  const { open, handleClose } = useModal(true);

  const handleModalClose = useCallback(() => {
    const cookies = new Cookies();
    handleClose();
    cookies.set(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
  }, [handleClose]);

  if (!open)
    return (
      <ConnectStripeToast
        revenueProgramId={revenueProgramId}
        createStripeAccountLinkMutation={createStripeAccountLinkMutation}
      />
    );
  return (
    <S.Modal open={open} onClose={handleClose} aria-labelledby="Connect Stripe Modal">
      <S.ConnectStripeModal data-testid="connect-stripe-modal">
        <S.StripeLogo src={StripeLogo} />
        <S.h1>Connect to Stripe</S.h1>
        <S.Description>
          Start receiving payments by creating a Stripe account and connecting in one easy step.
          <S.Bold>Need more help connecting?</S.Bold>
          Check out our <S.StripeFAQ href={CONNECT_STRIPE_FAQ_LINK}>Stripe Connection FAQ</S.StripeFAQ>.
        </S.Description>
        <S.Button
          data-testid="connect-stripe-modal-button"
          disabled={createStripeAccountLinkMutation.isLoading}
          onClick={() => createStripeAccountLinkMutation.mutate(revenueProgramId)}
        >
          Connect to Stripe
        </S.Button>
        <S.Anchor onClick={handleModalClose}>
          <span>I’ll connect to Stripe later</span>
          <ChevronRightIcon />
        </S.Anchor>
        <S.BottomNav src={BottomNav} />
      </S.ConnectStripeModal>
    </S.Modal>
  );
};

ConnectStripeModal.propTypes = {
  revenueProgramId: PropTypes.number.isRequired,
  createStripeAccountLinkMutation: PropTypes.object.isRequired
};

const ConnectStripeElements = ({ revenueProgramId, createStripeAccountLinkMutation }) => {
  const cookies = new Cookies();

  if (cookies.get(CONNECT_STRIPE_COOKIE_NAME)) {
    return (
      <ConnectStripeToast
        revenueProgramId={revenueProgramId}
        createStripeAccountLinkMutation={createStripeAccountLinkMutation}
      />
    );
  }

  return (
    <ConnectStripeModal
      revenueProgramId={revenueProgramId}
      createStripeAccountLinkMutation={createStripeAccountLinkMutation}
    />
  );
};

ConnectStripeElements.propTypes = {
  revenueProgramId: PropTypes.number.isRequired,
  createStripeAccountLinkMutation: PropTypes.object.isRequired
};

export default ConnectStripeElements;
