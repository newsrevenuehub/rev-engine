import { useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as S from './ConnectStripeElements.styled';
import ConnectStripeToast from './ConnectStripeToast';

// Assets
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import BottomNav from 'assets/icons/bottomNav.svg';
import StripeLogo from 'assets/icons/stripeLogo.svg';

import useModal from 'hooks/useModal';
import Cookies from 'universal-cookie';

import axios from 'ajax/axios';
// import * as authConstants from 'constants/authConstants';
import { REVENUE_PROGRAMS } from 'ajax/endpoints';

const CONNECT_STRIPE_COOKIE_NAME = 'hideConnectStripeModal';

// TODO: Insert Stripe FAQ Link
const CONNECT_STRIPE_FAQ_LINK = '';

function fetchRp(rpId) {
  return axios.get(`${REVENUE_PROGRAMS}${rpId}/`).then(({ data }) => data);
}

const ConnectStripeModal = ({ rpId, paymentProvider }) => {
  const { open, handleClose } = useModal(true);

  const handleModelClose = useCallback(() => {
    const cookies = new Cookies();
    handleClose();
    cookies.set(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
  }, [handleClose]);

  // setting enabled to false here stops query from running on initial page load
  const rpQuery = useQuery(['getRp'], () => fetchRp(rpId), { enabled: false });

  const handleConnectToStripe = () => {
    const queries = [];
  };

  if (!open) return <ConnectStripeToast />;
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
        <S.Button onClick={handleConnectToStripe}>Connect to Stripe</S.Button>
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
