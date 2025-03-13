import PropTypes, { InferProps } from 'prop-types';
import { ReactChild, useState } from 'react';
import { Modal, ModalHeader } from 'components/base';
import { useConnectActiveCampaign } from 'hooks/useConnectActiveCampaign';
import { Connected, CreateUser, EnterApiKey, GetApiKey, UserNeeded, UserQuestion } from './steps';
import { ModalHeaderIcon } from './ConnectionModal.styled';

const ConnectionModalPropTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface ConnectionModalProps extends InferProps<typeof ConnectionModalPropTypes> {
  onClose: () => void;
}

/**
 * Runs through the ActiveCampaign integration process for an org, where they
 * enter the server URL and API key manually.
 */
export function ConnectionModal({ onClose, open }: ConnectionModalProps) {
  const { activecampaign_server_url, updateApiKeyAndServerUrl } = useConnectActiveCampaign();
  const [updateError, setUpdateError] = useState<ReactChild>();

  // There is one branch in the flow here. Note that you can't go back from userNeeded or connected.
  //
  // userQuestion <-- yes --> createUser <--> getApiKey <--> enterApiKey --> connected
  //              --- no ---> userNeeded
  const [step, setStep] = useState<
    'connected' | 'createUser' | 'enterAPIKey' | 'getAPIKey' | 'userQuestion' | 'userNeeded'
  >('userQuestion');

  function handleClose() {
    setStep('userQuestion');
    onClose();
  }

  function handleUserQuestionNextStep(userCreated: boolean) {
    if (userCreated) {
      setStep('createUser');
    } else {
      setStep('userNeeded');
    }
  }

  async function handleSetKeyAndUrl(apiKey: string, serverUrl: string) {
    if (!updateApiKeyAndServerUrl) {
      // Should never happen.
      throw new Error('updateApiKeyAndServerUrl is undefined');
    }

    setUpdateError(undefined);

    try {
      await updateApiKeyAndServerUrl({ apiKey, serverUrl });
      setStep('connected');
    } catch (error) {
      setUpdateError(
        <>
          <strong>Failed to save API information.</strong> Please try again.
        </>
      );
    }
  }

  return (
    <Modal width={660} open={!!open} onClose={handleClose} aria-label="ActiveCampaign Connection">
      <ModalHeader icon={<ModalHeaderIcon />} onClose={handleClose}>
        ActiveCampaign Connection
      </ModalHeader>
      <>{step === 'userQuestion' && <UserQuestion onNextStep={handleUserQuestionNextStep} />}</>
      <>{step === 'userNeeded' && <UserNeeded onClose={handleClose} />}</>
      <>
        {step === 'createUser' && (
          <CreateUser onNextStep={() => setStep('getAPIKey')} onPreviousStep={() => setStep('userQuestion')} />
        )}
      </>
      <>
        {step === 'getAPIKey' && (
          <GetApiKey onNextStep={() => setStep('enterAPIKey')} onPreviousStep={() => setStep('createUser')} />
        )}
      </>
      <>
        {step === 'enterAPIKey' && (
          <EnterApiKey
            error={updateError}
            onPreviousStep={() => setStep('getAPIKey')}
            onSetKeyAndUrl={handleSetKeyAndUrl}
          />
        )}
      </>
      <>
        {step === 'connected' && activecampaign_server_url && (
          <Connected onClose={handleClose} serverUrl={activecampaign_server_url} />
        )}
      </>
    </Modal>
  );
}

ConnectionModal.propTypes = ConnectionModalPropTypes;
export default ConnectionModal;
