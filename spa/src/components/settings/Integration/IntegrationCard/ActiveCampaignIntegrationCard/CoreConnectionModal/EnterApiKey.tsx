import { ArrowBack, ArrowForward } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { Button, ModalContent } from 'components/base';
import Instructions from './Instructions';
import { ModalFooter, TextField, TextFields } from './EnterApiKey.styled';
import { StepHeading, StepRoot } from './common.styled';

const EnterApiKeyPropTypes = {
  onPreviousStep: PropTypes.func.isRequired,
  onSetKeyAndUrl: PropTypes.func.isRequired
};

export interface EnterApiKeyProps extends InferProps<typeof EnterApiKeyPropTypes> {
  onPreviousStep: () => void;
  onSetKeyAndUrl: (apiKey: string, serverUrl: string) => void;
}

export function EnterApiKey({ onPreviousStep, onSetKeyAndUrl }: EnterApiKeyProps) {
  const [apiKey, setApiKey] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  return (
    <>
      <ModalContent>
        <Instructions />
        <StepRoot>
          <p>TODO step 3 of 4</p>
          <StepHeading>Enter API URL &amp; Key</StepHeading>
          <p>Paste the copied API URL and key into the fields below.</p>
          <TextFields>
            <TextField label="API URL" onChange={(event) => setServerUrl(event.target.value)} value={serverUrl} />
            <TextField label="API Key" onChange={(event) => setApiKey(event.target.value)} value={apiKey} />
          </TextFields>
        </StepRoot>
      </ModalContent>
      <ModalFooter>
        <Button color="text" onClick={onPreviousStep} startIcon={<ArrowBack />}>
          Previous Step
        </Button>
        <Button
          color="text"
          disabled={apiKey.trim() === '' || serverUrl.trim() === ''}
          endIcon={<ArrowForward />}
          onClick={() => onSetKeyAndUrl(apiKey, serverUrl)}
        >
          Finish Connection
        </Button>
      </ModalFooter>
    </>
  );
}

EnterApiKey.propTypes = EnterApiKeyPropTypes;
export default EnterApiKey;
