import * as S from './ReauthModal.styled';
import Login from './Login';

function ReauthModal({ isOpen, closeModal, callbacks }) {
  const onSuccess = () => {
    // TODO: What happens here if the user has signed in to a different account?
    // If we send orgSlug and rpSlug via params, then calling these callbacks will
    // send the orgSlug and rpSlug from the previously logged in user.
    // That might be fine. Since a different user's JWT is sent, the callback requests
    // will succeed if permitted and fail if not-- just like normal.
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
