import { ArrowBack, ArrowForward } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { Button, ModalContent } from 'components/base';
import Instructions from './Instructions';
import { ModalFooter, Screenshots } from './GetApiKey.styled';
import { StepHeading, StepRoot, StepSubheading } from './common.styled';

const GetApiKeyPropTypes = {
  onNextStep: PropTypes.func.isRequired,
  onPreviousStep: PropTypes.func.isRequired
};

export interface GetApiKeyProps extends InferProps<typeof GetApiKeyPropTypes> {
  onNextStep: () => void;
  onPreviousStep: () => void;
}

export function GetApiKey({ onNextStep, onPreviousStep }: GetApiKeyProps) {
  return (
    <>
      <ModalContent>
        <Instructions />
        <StepRoot>
          <p>TODO step 2 of 4</p>
          <StepHeading>API URL &amp; Key</StepHeading>
          <p>Once logged in as the new user, navigate to Settings › Developer.</p>
          <Screenshots>
            <div>
              <StepSubheading>Settings › Developer</StepSubheading>
              <img src="https://placehold.co/200x200" alt="Settings › Developer screenshot" />
            </div>
            <div>
              <StepSubheading>API URL and key</StepSubheading>
              <img src="https://placehold.co/200x200" alt="API URL and key screenshot" />
            </div>
          </Screenshots>
        </StepRoot>
      </ModalContent>
      <ModalFooter>
        <Button color="text" onClick={onPreviousStep} startIcon={<ArrowBack />}>
          Previous Step
        </Button>
        <Button color="text" endIcon={<ArrowForward />} onClick={onNextStep}>
          Next Step
        </Button>
      </ModalFooter>
    </>
  );
}

GetApiKey.propTypes = GetApiKeyPropTypes;
export default GetApiKey;
