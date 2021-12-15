import { useState, useEffect, useCallback } from 'react';
import * as S from './ContributorVerify.styled';

// Deps// Deps
import queryString from 'query-string';

// Routing
import { CONTRIBUTOR_DASHBOARD, CONTRIBUTOR_ENTRY } from 'routes';
import { useHistory, useLocation } from 'react-router-dom';

// AJAX
import axios from 'ajax/axios';
import { VERIFY_TOKEN } from 'ajax/endpoints';
import { LS_CONTRIBUTOR, LS_CSRF_TOKEN } from 'settings';

// Children
import GlobalLoading from 'elements/GlobalLoading';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

function ContributorVerify() {
  const history = useHistory();
  const location = useLocation();

  const [couldNotVerify, setCouldNotVerify] = useState(false);

  useConfigureAnalytics();

  const handleVerifySuccess = useCallback(
    (response) => {
      if (response.status !== 200) throw new Error(`Unexpected non-failure response code: ${response.status}`);
      localStorage.setItem(LS_CONTRIBUTOR, JSON.stringify(response.data.contributor));
      localStorage.setItem(LS_CSRF_TOKEN, response.data.csrftoken);
      history.replace(CONTRIBUTOR_DASHBOARD);
    },
    [history]
  );

  useEffect(() => {
    async function verifyToken() {
      try {
        const qs = queryString.parse(location.search);
        const { email, token } = qs;
        const response = await axios.post(VERIFY_TOKEN, { token, email });
        handleVerifySuccess(response);
      } catch (e) {
        setCouldNotVerify(true);
      }
    }
    verifyToken();
  }, [location.search, handleVerifySuccess]);

  return (
    <S.ContributorVerify>
      {couldNotVerify ? (
        <S.CouldNotVerify>
          <p>We were unable to log you in.</p>
          <p>
            Magic links have short expiration times. If your link expired, <a href={CONTRIBUTOR_ENTRY}>click here</a> to
            get another.
          </p>
        </S.CouldNotVerify>
      ) : (
        <>
          <GlobalLoading />
          <S.LoadingVerification>Looking for your contributions...</S.LoadingVerification>
        </>
      )}
    </S.ContributorVerify>
  );
}

export default ContributorVerify;
