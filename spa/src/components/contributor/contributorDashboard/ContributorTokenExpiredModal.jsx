import { CONTRIBUTOR_ENTRY } from 'routes';
import Modal from 'elements/modal/Modal';
import { ExpiredMessage, Icon, Message, Root } from './ContributorTokenExpiredModal.styled';

function ContributorTokenExpiredModal({ isOpen }) {
  return (
    <Modal isOpen={isOpen}>
      <Root>
        <ExpiredMessage>
          <Icon />
          <Message>
            Your session has expired. <a href={CONTRIBUTOR_ENTRY}>Get another magic link?</a>
          </Message>
        </ExpiredMessage>
      </Root>
    </Modal>
  );
}

export default ContributorTokenExpiredModal;
