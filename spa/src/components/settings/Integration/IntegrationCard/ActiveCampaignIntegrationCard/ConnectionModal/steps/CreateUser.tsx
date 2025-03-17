import { ArrowBack, ArrowForward } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import settingsImage from 'assets/images/activecampaign-setup/settings.png';
import usersAndGroupsImage from 'assets/images/activecampaign-setup/users-and-groups.png';
import { Button, ModalContent } from 'components/base';
import Instructions from '../Instructions';
import Progress from '../Progress';
import { Bullets, Screenshots } from './CreateUser.styled';
import { ModalFooter, StepHeading, StepRoot, StepSubheading } from './common.styled';

const CreateUserPropTypes = {
  onNextStep: PropTypes.func.isRequired,
  onPreviousStep: PropTypes.func.isRequired
};

export interface CreateUserProps extends InferProps<typeof CreateUserPropTypes> {
  onNextStep: () => void;
  onPreviousStep: () => void;
}

export function CreateUser({ onNextStep, onPreviousStep }: CreateUserProps) {
  return (
    <>
      <ModalContent>
        <Instructions />
        <StepRoot>
          <Progress currentStep={1} totalSteps={4} />
          <StepHeading>Create a new user</StepHeading>
          <Bullets>
            <li>Open ActiveCampaign.</li>
            <li>Navigate to 'Settings' › 'Users and Groups', and select 'Create a new user'.</li>
            <li>Enter the required information (you'll need access to the email address for verification purposes).</li>
            <li>
              Logout and re-login as the newly created user. The new user account is where you can manage your RevEngine
              integration.
            </li>
          </Bullets>
          <Screenshots>
            <div>
              <StepSubheading>Settings</StepSubheading>
              <img src={settingsImage} alt="Settings screenshot" height="200" width="200" />
            </div>
            <div>
              <StepSubheading>Users and Groups</StepSubheading>
              <img src={usersAndGroupsImage} alt="Users and Groups screenshot" height="200" width="200" />
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

CreateUser.propTypes = CreateUserPropTypes;
export default CreateUser;
