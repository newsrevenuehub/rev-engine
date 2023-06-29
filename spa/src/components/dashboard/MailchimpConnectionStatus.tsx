import MailchimpModal from 'components/common/IntegrationCard/MailchimpIntegrationCard/MailchimpModal';
import AudienceListModal from 'components/common/Modal/AudienceListModal';
import SystemNotification from 'components/common/SystemNotification';
import GlobalLoading from 'elements/GlobalLoading';
import useConnectMailchimp from 'hooks/useConnectMailchimp';
import useModal from 'hooks/useModal';
import usePreviousState from 'hooks/usePreviousState';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo } from 'react';

// This is a component responsible for handling connection status to Mailchimp.
export default function MailchimpConnectionStatus() {
  const {
    isLoading,
    audiences,
    selectedAudienceId,
    connectedToMailchimp,
    organizationPlan = 'FREE',
    setRefetchInterval
  } = useConnectMailchimp();
  const { enqueueSnackbar } = useSnackbar();
  const { open, handleClose } = useModal(true);
  const prevMailchimpAudienceId = usePreviousState(selectedAudienceId);

  // Only require audience selection if there is no list selected, and if the
  // audience lists is populated (mailchimp connection successfully started).
  const requiresAudienceSelection = useMemo(
    () => !selectedAudienceId && (audiences?.length ?? 0) > 0,
    [audiences?.length, selectedAudienceId]
  );

  // To know when mailchimp has successfully finalized the entire connection process,
  // we need to know when the user has just selected an audience.
  const justConnectedToMailchimp = useMemo(
    () =>
      typeof selectedAudienceId === 'string' &&
      (prevMailchimpAudienceId === null || prevMailchimpAudienceId === undefined),
    [selectedAudienceId, prevMailchimpAudienceId]
  );
  const showSuccessModal = open && justConnectedToMailchimp;

  useEffect(() => {
    // Reset the retrieval interval; we might have increased it in
    // MailchimpOAuthSuccess. We might not have if the user ended their session
    // after starting the Mailchimp connection process, but in that case, this
    // will do nothing.
    if (requiresAudienceSelection) {
      setRefetchInterval(false);
    }
  }, [requiresAudienceSelection, setRefetchInterval]);

  const closeAndShowSuccessNotification = () => {
    handleClose();
    enqueueSnackbar('You’ve successfully connected to Mailchimp! Your contributor data will sync automatically.', {
      persist: true,
      content: (key: string, message: string) => (
        <SystemNotification id={key} message={message} header="Successfully Connected!" type="success" />
      )
    });
  };

  if (isLoading) {
    return <GlobalLoading />;
  }

  return (
    <>
      {requiresAudienceSelection && <AudienceListModal open={requiresAudienceSelection} />}
      {showSuccessModal && (
        <MailchimpModal
          open={showSuccessModal}
          onClose={closeAndShowSuccessNotification}
          organizationPlan={organizationPlan}
          isActive={connectedToMailchimp}
        />
      )}
    </>
  );
}
