import * as S from './Dashboard.styled';
import LogoutButton from 'components/authentication/LogoutButton';

function Dashboard(props) {
  return (
    <S.Dashboard>
      <p>Dashboard</p>
      <LogoutButton />
    </S.Dashboard>
  );
}

export default Dashboard;
