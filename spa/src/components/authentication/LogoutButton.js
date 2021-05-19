import * as S from './LogoutButton.styled';

import logout from 'components/authentication/logout';

function LogoutButton() {
  return <S.LogoutButton onClick={logout}>Sign out</S.LogoutButton>;
}

export default LogoutButton;
