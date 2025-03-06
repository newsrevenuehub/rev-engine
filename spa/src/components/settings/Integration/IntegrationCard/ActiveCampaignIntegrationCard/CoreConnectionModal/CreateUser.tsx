import PropTypes, { InferProps } from 'prop-types';
import { Button, ModalContent } from 'components/base';
import Instructions from './Instructions';
import { ArrowBack, ArrowForward } from '@material-ui/icons';
import { Bullets, ModalFooter, Screenshots } from './CreateUser.styled';
import { StepHeading, StepRoot, StepSubheading } from './common.styled';

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
        <p>TODO step 1 of 4</p>
        <StepRoot>
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
              <img src="https://placehold.co/200x200" alt="Settings screenshot" />
            </div>
            <div>
              <StepSubheading>Users and Groups</StepSubheading>
              <img src="https://placehold.co/200x200" alt="Users and Groups screenshot" />
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

CreateUser.propTypes = CreateUserPropTypes;
export default CreateUser;
