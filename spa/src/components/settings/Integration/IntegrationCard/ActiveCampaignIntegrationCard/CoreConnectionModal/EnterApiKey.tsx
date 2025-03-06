import { ArrowBack, ArrowForward } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { FormEvent, useState } from 'react';
import { Button, ModalContent } from 'components/base';
import Instructions from './Instructions';
import { ModalFooter, TextField, TextFields } from './EnterApiKey.styled';
import { StepHeading, StepRoot } from './common.styled';
import Progress from './Progress';

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
  const submitDisabled = apiKey.trim() === '' || serverUrl.trim() === '';

  function handleSubmit(event: FormEvent) {
    // TODO: validate URL

    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    onSetKeyAndUrl(apiKey, serverUrl);
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalContent>
        <Instructions />
        <StepRoot>
          <Progress currentStep={3} totalSteps={4} />
          <StepHeading>Enter API URL &amp; Key</StepHeading>
          <p>Paste the copied API URL and key into the fields below.</p>
          <TextFields>
            <TextField
              label="API URL"
              onChange={(event) => setServerUrl(event.target.value)}
              type="url"
              value={serverUrl}
            />
            <TextField label="API Key" onChange={(event) => setApiKey(event.target.value)} value={apiKey} />
          </TextFields>
        </StepRoot>
      </ModalContent>
      <ModalFooter>
        <Button color="text" onClick={onPreviousStep} startIcon={<ArrowBack />}>
          Previous Step
        </Button>
        <Button
          color="primaryDark"
          disabled={apiKey.trim() === '' || serverUrl.trim() === ''}
          endIcon={<ArrowForward />}
          onClick={handleSubmit}
          type="submit"
        >
          Finish Connection
        </Button>
      </ModalFooter>
    </form>
  );
}

EnterApiKey.propTypes = EnterApiKeyPropTypes;
export default EnterApiKey;
