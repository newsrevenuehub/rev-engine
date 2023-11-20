import * as S from './ReauthModal.styled';
import Login from './Login';

function ReauthModal({ isOpen, closeModal, callbacks }) {
  const onSuccess = () => {
    callbacks.forEach((cb) => cb());
    closeModal();
  };

  return (
    <S.Modal isOpen={isOpen}>
      <Login onSuccess={onSuccess} message="Your session has expired. Please sign back in." />
    </S.Modal>
  );
}

export default ReauthModal;
