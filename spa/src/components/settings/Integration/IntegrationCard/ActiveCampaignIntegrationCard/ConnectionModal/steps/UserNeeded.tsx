import PropTypes, { InferProps } from 'prop-types';
import { Button, Link, LinkButton, ModalContent } from 'components/base';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';
import { ModalFooter } from './common.styled';

const UserNeededPropTypes = {
  onClose: PropTypes.func.isRequired
};

export interface UserNeededProps extends InferProps<typeof UserNeededPropTypes> {
  onClose: () => void;
}

export function UserNeeded({ onClose }: UserNeededProps) {
  return (
    <>
      <ModalContent>
        <p>
          Please add an extra user to your ActiveCampaign account before connecting to RevEngine.{' '}
          <Link href={KNOWLEDGE_BASE_URL} target="_blank">
            Learn more about adding users in ActiveCampaign.
          </Link>
        </p>
      </ModalContent>
      <ModalFooter>
        <LinkButton color="primaryDark" href={KNOWLEDGE_BASE_URL} target="_blank">
          Knowledge Base
        </LinkButton>
        <Button color="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
}

UserNeeded.propTypes = UserNeededPropTypes;
export default UserNeeded;
