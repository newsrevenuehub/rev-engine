import { Redirect, useLocation } from 'react-router-dom';

import * as S from './Main.styled';

import Dashboard from 'components/dashboard/Dashboard';
import Verify from 'components/account/Verify';

import { useConfigureAnalytics } from './analytics';
import { CONTENT_SLUG, PROFILE, VERIFY_EMAIL_SUCCESS } from 'routes';
import needsProfileFinalization from 'utilities/needsProfileFinalization';
import useUser from 'hooks/useUser';

function Main() {
  useConfigureAnalytics();
  const { user, isLoading } = useUser();
  const { pathname } = useLocation();
  const isVerifyEmailPath = pathname.includes(VERIFY_EMAIL_SUCCESS);
  const isProfilePath = useLocation().pathname.includes(PROFILE);

  if (user) {
    if (user.email_verified) {
      if (needsProfileFinalization(user) && !isProfilePath) {
        // If the user hasn't finished setting up their profile, force them to
        // do so.

        return <Redirect to={PROFILE} />;
      } else if (isVerifyEmailPath || (isProfilePath && !needsProfileFinalization(user))) {
        // If the user is on a route they don't need anymore (they've verified
        // their email already but are still on the email verification route),
        // send them to the default route.

        return <Redirect to={CONTENT_SLUG} />;
      }
    } else if (!isVerifyEmailPath) {
      // If the user hasn't verified their email yet, force them to do so.

      return <Redirect to={VERIFY_EMAIL_SUCCESS} />;
    }
  }

  return (
    <>
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
    </>
  );
}

export default Main;
