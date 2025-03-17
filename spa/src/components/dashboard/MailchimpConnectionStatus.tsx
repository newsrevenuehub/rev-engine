import MailchimpModal from 'components/settings/Integration/IntegrationCard/MailchimpIntegrationCard/MailchimpModal';
import AudienceListModal from 'components/common/Modal/AudienceListModal';
import SystemNotification from 'components/common/SystemNotification';
import { GlobalLoading } from 'components/common/GlobalLoading';
import useConnectMailchimp from 'hooks/useConnectMailchimp';
import useModal from 'hooks/useModal';
import usePreviousState from 'hooks/usePreviousState';
import useUser from 'hooks/useUser';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo } from 'react';

// This is a component responsible for handling connection status to Mailchimp.
export default function MailchimpConnectionStatus() {
  const { user } = useUser();
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

  const showSuccessModal = useMemo(() => {
    // If the user closed the modal, don't show it again.
    if (!open) {
      return false;
    }
    // Otherwise, show it if the user has just selected an audience.
    return typeof selectedAudienceId === 'string' && prevMailchimpAudienceId === null;
    // Cannot check for "prevMailchimpAudienceId === undefined" because initial
    // render will always return undefined making the modal always show up on
    //  first render if audience is selected
  }, [open, prevMailchimpAudienceId, selectedAudienceId]);

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
      {showSuccessModal && user && (
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
