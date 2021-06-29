import * as S from './ContributorTokenExpiredModal.styled';

import Modal from 'elements/modal/Modal';

function ContributorTokenExpiredModal({ isOpen }) {
  return (
    <Modal isOpen={isOpen}>
      <S.ContributorTokenExpiredModal>
        <p>ContributorTokenExpiredModal</p>
      </S.ContributorTokenExpiredModal>
    </Modal>
  );
}

export default ContributorTokenExpiredModal;
