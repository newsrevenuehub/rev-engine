import * as S from './LogoutButton.styled';

import { handleLogout } from 'components/authentication/util';

function LogoutButton() {
  return (
    <S.LogoutButton onClick={handleLogout}>Sign out</S.LogoutButton>
  ) 
}

export default LogoutButton;
