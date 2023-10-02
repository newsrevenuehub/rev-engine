import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useCookies } from 'react-cookie';
import SystemNotification from 'components/common/SystemNotification';
import { CONNECT_STRIPE_COOKIE_NAME } from 'constants/textConstants';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import ConnectStripeModal from './ConnectStripeModal';
import ConnectStripeToast from './ConnectStripeToast';
import { Notification } from './ConnectStripe.styled';

/**
 * Tries to update a Pendo user's metadata as having interacted with the Stripe
 * connection modal. This uses the Pendo global initialized by usePendo(). If
 * something goes wrong, this logs an error and returns.
 * @see https://agent.pendo.io/
 */
function setModalInteractionPendoMetadata() {
  // Sadly, there don't seem to be TypeScript definitions for Pendo available.
  const pendo: any = (window as any).pendo;

  if (!pendo) {
    console.error("Couldn't record Stripe modal interaction in Pendo because pendo global is undefined");
    return;
  }

  try {
    pendo.updateOptions({ visitor: { stripe_connection_modal_first_interaction: new Date().toISOString() } });
  } catch (error) {
    console.error("Couldn't record Stripe modal interaction in Pendo", error);
  }
}

function ConnectStripe() {
  const { enqueueSnackbar } = useSnackbar();
  const [cookies, setCookie] = useCookies([CONNECT_STRIPE_COOKIE_NAME]);
  const { displayConnectionSuccess, hideConnectionSuccess, isLoading, requiresVerification, sendUserToStripe } =
    useConnectStripeAccount();
  const [modalOpen, setModalOpen] = useState(!cookies[CONNECT_STRIPE_COOKIE_NAME]);

  useEffect(() => {
    if (displayConnectionSuccess) {
      enqueueSnackbar('Stripe verification has been completed. Your contribution page can now be published!', {
        persist: true,
        content: (key, message) => (
          <Notification>
            <SystemNotification
              id={key.toString()}
              message={<>{message}</>}
              header="Stripe Successfully Connected!"
              type="success"
            />
          </Notification>
        )
      });
      hideConnectionSuccess();
    }
  }, [displayConnectionSuccess, enqueueSnackbar, hideConnectionSuccess]);

  function handleCloseModal() {
    setCookie(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
    setModalInteractionPendoMetadata();
    setModalOpen(false);
  }

  function handleConnectStripe() {
    // Should never happen.

    if (!sendUserToStripe) {
      throw new Error('sendUserToStripe is not defined');
    }

    setCookie(CONNECT_STRIPE_COOKIE_NAME, true, { path: '/' });
    setModalInteractionPendoMetadata();
    sendUserToStripe();
  }

  if (isLoading || !requiresVerification) {
    return null;
  }

  if (modalOpen) {
    return <ConnectStripeModal onClose={handleCloseModal} onConnectStripe={handleConnectStripe} open />;
  }

  return <ConnectStripeToast />;
}

export default ConnectStripe;
