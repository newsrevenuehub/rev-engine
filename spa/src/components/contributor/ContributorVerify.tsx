import axios from 'ajax/axios';
import { VERIFY_TOKEN } from 'ajax/endpoints';
import { LS_CONTRIBUTOR, LS_CSRF_TOKEN, NEW_PORTAL_ENABLED_RPS, SS_CONTRIBUTOR } from 'appSettings';
import { AxiosResponse } from 'axios';
import { useConfigureAnalytics } from 'components/analytics';
import { GlobalLoading } from 'components/common/GlobalLoading';
import { Contributor } from 'hooks/usePortalAuth';
import { getRevenueProgramSlug } from 'utilities/getRevenueProgramSlug';
import queryString from 'query-string';
import { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { CONTRIBUTOR_DASHBOARD, PORTAL } from 'routes';
import { ContributorVerifyWrapper } from './ContributorVerify.styled';

function ContributorVerify() {
  const history = useHistory();
  const location = useLocation();

  const [couldNotVerify, setCouldNotVerify] = useState(false);

  useConfigureAnalytics();

  const handleVerifySuccess = useCallback(
    (response: AxiosResponse<{ contributor: Contributor; csrftoken: string }>) => {
      if (response.status !== 200) {
        throw new Error(`Unexpected non-failure response code: ${response.status}`);
      }

      sessionStorage.setItem(SS_CONTRIBUTOR, JSON.stringify(response.data.contributor));
      localStorage.setItem(LS_CONTRIBUTOR, JSON.stringify(response.data.contributor));
      localStorage.setItem(LS_CSRF_TOKEN, response.data.csrftoken);

      if (NEW_PORTAL_ENABLED_RPS.includes(getRevenueProgramSlug())) {
        // We need to do a full redirect because of our router setup. We're
        // inside ContributorRouter which has no awareness of portal routes.
        window.location.replace(PORTAL.CONTRIBUTIONS);
      } else {
        history.replace(CONTRIBUTOR_DASHBOARD);
      }
    },
    [history]
  );

  useEffect(() => {
    async function verifyToken() {
      try {
        const qs = queryString.parse(location.search);
        const { email, token } = qs;
        const response = await axios.post<{ contributor: Contributor; csrftoken: string }>(VERIFY_TOKEN, {
          token,
          email
        });
        handleVerifySuccess(response);
      } catch (e) {
        setCouldNotVerify(true);
      }
    }
    verifyToken();
  }, [location.search, handleVerifySuccess]);

  return (
    <ContributorVerifyWrapper>
      {couldNotVerify ? (
        <div>
          <p>We were unable to log you in.</p>
          <p>
            Magic links have short expiration times. If your link expired, <a href={PORTAL.ENTRY}>click here</a> to get
            another.
          </p>
        </div>
      ) : (
        <>
          <GlobalLoading />
          <div>Looking for your contributions...</div>
        </>
      )}
    </ContributorVerifyWrapper>
  );
}

export default ContributorVerify;
