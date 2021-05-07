import { useState, useEffect } from 'react';
import * as S from './Dashboard.styled';

// Children
import LogoutButton from 'components/authentication/LogoutButton';

// Hooks
import useUser from 'hooks/useUser';

// Utils
import userHasPaymentProvider from 'utilities/userHasPaymentProvider';

// TEMP
import { Link } from 'react-router-dom';

function Dashboard() {
  const user = useUser();
  const [hasPaymentProvider, setHasPaymentProvider] = useState(false);

  useEffect(() => {
    setHasPaymentProvider(userHasPaymentProvider(user));
  }, [user]);

  return (
    <S.Dashboard>
      <p>Dashboard</p>
      <LogoutButton />
      <Link to="/temp-pretend-payment">Make pretend payment</Link>
    </S.Dashboard>
  );
}

export default Dashboard;
