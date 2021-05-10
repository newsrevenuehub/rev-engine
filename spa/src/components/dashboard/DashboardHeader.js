import * as S from './DashboardHeader.styled';

import useUser from 'hooks/useUser';
import LogoutButton from 'components/authentication/LogoutButton';

function DashboardHeader(props) {
  const user = useUser();

  return (
    <S.DashboardHeader>
      <p>{user?.organization?.name}</p>
      <LogoutButton />
    </S.DashboardHeader>
  );
}

export default DashboardHeader;
