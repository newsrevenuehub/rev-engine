import * as S from './ContributorTokenExpiredModal.styled';
import { CONTRIBUTOR_ENTRY } from 'routes';
import Modal from 'elements/modal/Modal';

function ContributorTokenExpiredModal({ isOpen }) {
  return (
    <Modal isOpen={isOpen}>
      <S.ContributorTokenExpiredModal>
        <S.ExpiredMessage>
          <S.Icon />
          <S.Message>
            Your session has expired. <a href={CONTRIBUTOR_ENTRY}>Get another magic link?</a>
          </S.Message>
        </S.ExpiredMessage>
      </S.ContributorTokenExpiredModal>
    </Modal>
  );
}

export default ContributorTokenExpiredModal;
