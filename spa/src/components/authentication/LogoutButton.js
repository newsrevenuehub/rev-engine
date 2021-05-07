import * as S from './LogoutButton.styled';

import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';
import { handleLogoutSuccess } from 'components/authentication/util';

function LogoutButton() {
  const handleLogout = () => {
    axios.delete(TOKEN);
    handleLogoutSuccess();
  };

  return <S.LogoutButton onClick={handleLogout}>Sign out</S.LogoutButton>;
}

export default LogoutButton;
