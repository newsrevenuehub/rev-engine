import { ArrowBack, ArrowForward } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { Button, ModalContent } from 'components/base';
import Instructions from '../Instructions';
import Progress from '../Progress';
import ErrorMessage from '../ErrorMessage';
import { StepHeading, StepRoot } from './common.styled';
import { ModalFooter, TextField, TextFields } from './EnterApiKey.styled';

const EnterApiKeyPropTypes = {
  error: PropTypes.node,
  onPreviousStep: PropTypes.func.isRequired,
  onSetKeyAndUrl: PropTypes.func.isRequired
};

export interface EnterApiKeyProps extends InferProps<typeof EnterApiKeyPropTypes> {
  onPreviousStep: () => void;
  onSetKeyAndUrl: (apiKey: string, serverUrl: string) => void;
}

export function EnterApiKey({ error, onPreviousStep, onSetKeyAndUrl }: EnterApiKeyProps) {
  const [apiKey, setApiKey] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [serverUrlFieldError, setServerUrlFieldError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const submitDisabled = apiKey.trim() === '' || serverUrl.trim() === '';

  function handleUrlFieldChange(event: ChangeEvent<HTMLInputElement>) {
    setServerUrl(event.target.value);

    // If the user has fixed a validation error, clear the message.

    if (serverUrlFieldError && event.target.checkValidity()) {
      setServerUrlFieldError(undefined);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    // Block submission if the URL field isn't a URL. This will cause the
    // onInvalid handler on the field to fire.

    if (!formRef.current?.checkValidity()) {
      return;
    }

    onSetKeyAndUrl(apiKey, serverUrl);
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <ModalContent>
        <Instructions />
        <StepRoot>
          <Progress currentStep={3} totalSteps={4} />
          <StepHeading>Enter API URL &amp; Key</StepHeading>
          <p>Paste the copied API URL and key into the fields below.</p>
          <TextFields>
            <TextField
              error={!!serverUrlFieldError}
              helperText={serverUrlFieldError}
              id="core-connection-modal-api-url"
              label="API URL"
              onChange={handleUrlFieldChange}
              onInvalid={(event) => setServerUrlFieldError((event.target as HTMLInputElement).validationMessage)}
              required
              type="url"
              value={serverUrl}
            />
            <TextField
              id="core-connection-modal-api-key"
              label="API Key"
              onChange={(event) => setApiKey(event.target.value)}
              required
              value={apiKey}
            />
          </TextFields>
        </StepRoot>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </ModalContent>
      <ModalFooter>
        <Button color="text" onClick={onPreviousStep} startIcon={<ArrowBack />}>
          Previous Step
        </Button>
        <Button
          color="primaryDark"
          disabled={submitDisabled}
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
