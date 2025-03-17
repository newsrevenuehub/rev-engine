import PropTypes, { InferProps } from 'prop-types';
import { Button, Link, LinkButton, ModalContent } from 'components/base';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';
import Instructions from '../Instructions';
import Progress from '../Progress';
import { ModalFooter, StepHeading, StepRoot } from './common.styled';

const ConnectedPropTypes = {
  onClose: PropTypes.func.isRequired,
  serverUrl: PropTypes.string.isRequired
};

export interface ConnectedProps extends InferProps<typeof ConnectedPropTypes> {
  onClose: () => void;
}

export function Connected({ onClose, serverUrl }: ConnectedProps) {
  return (
    <>
      <ModalContent>
        <Instructions />
        <StepRoot>
          <Progress currentStep={4} totalSteps={4} />
          <StepHeading>You're connected!</StepHeading>
          <p>
            It may take a few minutes for the information to be received in ActiveCampaign. View and manage the
            connection in Settings.
          </p>
          <p>
            Check out the{' '}
            <Link href={KNOWLEDGE_BASE_URL} target="_blank">
              RevEngine Knowledge Base
            </Link>{' '}
            for additional integration resources.
          </p>
        </StepRoot>
      </ModalContent>
      <ModalFooter>
        <LinkButton color="secondary" href={`${serverUrl}/app/settings/account/`} target="_blank">
          Go To Settings
        </LinkButton>
        <Button color="primaryDark" onClick={onClose}>
          Finish &amp; Close
        </Button>
      </ModalFooter>
    </>
  );
}

Connected.propTypes = ConnectedPropTypes;
export default Connected;
