import { ArrowBack, ArrowForward } from '@material-ui/icons';
import apiFieldsImage from 'assets/images/activecampaign-setup/api-fields.png';
import developerImage from 'assets/images/activecampaign-setup/developer.png';
import PropTypes, { InferProps } from 'prop-types';
import { Button, ModalContent } from 'components/base';
import Instructions from '../Instructions';
import Progress from '../Progress';
import { Screenshots } from './GetApiKey.styled';
import { ModalFooter, StepHeading, StepRoot, StepSubheading } from './common.styled';

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
          <Progress currentStep={2} totalSteps={4} />
          <StepHeading>API URL &amp; Key</StepHeading>
          <p>Once logged in as the new user, navigate to Settings › Developer.</p>
          <Screenshots>
            <div>
              <StepSubheading>Settings › Developer</StepSubheading>
              <img src={developerImage} alt="Settings › Developer screenshot" height="200" width="200" />
            </div>
            <div>
              <StepSubheading>API URL and key</StepSubheading>
              <img src={apiFieldsImage} alt="API URL and key screenshot" height="200" width="343" />
            </div>
          </Screenshots>
        </StepRoot>
      </ModalContent>
      <ModalFooter $spaced>
        <Button color="text" onClick={onPreviousStep} startIcon={<ArrowBack />}>
          Previous Step
        </Button>
        <Button color="primaryDark" endIcon={<ArrowForward />} onClick={onNextStep}>
          Next Step
        </Button>
      </ModalFooter>
    </>
  );
}

GetApiKey.propTypes = GetApiKeyPropTypes;
export default GetApiKey;
