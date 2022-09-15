import { Redirect, useLocation } from 'react-router-dom';

import * as S from './Main.styled';

import Dashboard from 'components/dashboard/Dashboard';
import Verify from 'components/account/Verify';

import { useConfigureAnalytics } from './analytics';
import { CONTENT_SLUG, VERIFY_EMAIL_SUCCESS } from 'routes';
import PageContextProvider from './dashboard/PageContext';
import useUser from 'hooks/useUser';

function Main() {
  useConfigureAnalytics();
  const { user, isLoading } = useUser();
  const { pathname } = useLocation();
  const isVerifyEmailPath = pathname.includes(VERIFY_EMAIL_SUCCESS);
  if (user) {
    if (!user.email_verified && !isVerifyEmailPath) {
      return <Redirect to={VERIFY_EMAIL_SUCCESS} />;
    }

    if (user.email_verified && isVerifyEmailPath) {
      return <Redirect to={CONTENT_SLUG} />;
    }
  }

  return (
    <PageContextProvider>
      {isLoading ? (
        ''
      ) : isVerifyEmailPath ? (
        <Verify />
      ) : (
        <S.Main>
          <S.MainContent>
            <Dashboard />
          </S.MainContent>
        </S.Main>
      )}
    </PageContextProvider>
  );
}

export default Main;
