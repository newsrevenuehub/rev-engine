import { ArrowForward } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { FormEvent, useState } from 'react';
import { Button, FormControlLabel, ModalContent, ModalFooter, Radio } from 'components/base';
import Instructions from '../Instructions';
import { RadioGroup } from './UserQuestion.styled';
import { StepHeading, StepRoot } from './common.styled';

const UserQuestionPropTypes = {
  onNextStep: PropTypes.func.isRequired
};

export interface UserQuestionProps extends InferProps<typeof UserQuestionPropTypes> {
  onNextStep: (userCreated: boolean) => void;
}

export function UserQuestion({ onNextStep }: UserQuestionProps) {
  const [userCreated, setUserCreated] = useState<'yes' | 'no'>();
  const formDisabled = userCreated === undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (formDisabled) {
      return;
    }

    onNextStep(userCreated === 'yes');
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalContent>
        <Instructions />
        <StepRoot>
          <StepHeading>Users</StepHeading>
          <p>
            In order to connect to ActiveCampaign, you'll need to add an additional user in your ActiveCampaign account.
            Does your plan have an additional user?
          </p>
          <RadioGroup name="userCreated" onChange={(event) => setUserCreated(event.target.value as 'yes' | 'no')}>
            <FormControlLabel control={<Radio />} label="Yes, my plan has an additional user" value="yes" />
            <FormControlLabel control={<Radio />} label="No, my plan doesn't have an additional user" value="no" />
          </RadioGroup>
        </StepRoot>
      </ModalContent>
      <ModalFooter>
        <Button color="primaryDark" disabled={formDisabled} endIcon={<ArrowForward />} type="submit">
          Next Step
        </Button>
      </ModalFooter>
    </form>
  );
}

UserQuestion.propTypes = UserQuestionPropTypes;
export default UserQuestion;
