import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { Modal, ModalHeader } from 'components/base';
import Connected from './Connected';
import { ModalHeaderIcon } from './CoreConnectionModal.styled';
import CreateUser from './CreateUser';
import EnterApiKey from './EnterApiKey';
import GetApiKey from './GetApiKey';
import UserNeeded from './UserNeeded';
import UserQuestion from './UserQuestion';
import { useConnectActiveCampaign } from 'hooks/useConnectActiveCampaign';

const CoreConnectionModalPropTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface CoreConnectionModalProps extends InferProps<typeof CoreConnectionModalPropTypes> {
  onClose: () => void;
}

/**
 * Runs through the ActiveCampaign integration process for an org on the Core
 * plan, where they enter the server URL and API key manually.
 */
export function CoreConnectionModal({ onClose, open }: CoreConnectionModalProps) {
  const { activecampaign_server_url, updateApiKeyAndServerUrl } = useConnectActiveCampaign();

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

    await updateApiKeyAndServerUrl({ apiKey, serverUrl });
    setStep('connected');
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
          <EnterApiKey onPreviousStep={() => setStep('getAPIKey')} onSetKeyAndUrl={handleSetKeyAndUrl} />
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

CoreConnectionModal.propTypes = CoreConnectionModalPropTypes;
export default CoreConnectionModal;
