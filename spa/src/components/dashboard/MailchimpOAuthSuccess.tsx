import { useMutation } from '@tanstack/react-query';
import queryString from 'query-string';
import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import axios from 'ajax/axios';
import { MAILCHIMP_OAUTH_SUCCESS } from 'ajax/endpoints';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';
import { SETTINGS } from 'routes';
import { useAlert } from 'react-alert';
import { GENERIC_ERROR } from 'constants/textConstants';

// This is an interstitial page we use solely to call `postMailchimpOAuthSuccess` to
// send to the BE the Mailchimp connection code. Redirect to /pages after completion.
export default function MailchimpOAuthSuccess() {
  const history = useHistory();
  const { search } = useLocation();
  const alert = useAlert();
  const { code } = queryString.parse(search);
  const { user, isError: userError, isLoading: userLoading } = useUser();
  const [hasUpdatedCode, setHasUpdatedCode] = useState(false);
  const {
    mutate: mailchimpOAuthSuccess,
    isLoading: isMailchimpOAuthLoading,
    isError: mailchimpOAuthError
  } = useMutation(({ mailchimpCode, rpId }: { mailchimpCode?: string; rpId?: number }) => {
    return postMailchimpOAuthSuccess(mailchimpCode, rpId);
  });

  async function postMailchimpOAuthSuccess(code?: string, rpId?: number) {
    try {
      const result = await axios.post(MAILCHIMP_OAUTH_SUCCESS, { mailchimp_oauth_code: code, revenue_program: rpId });
      return result;
    } catch (error) {
      console.error({ error });
      alert.error(GENERIC_ERROR);
    }
  }

  useEffect(() => {
    if (user && !userLoading && !hasUpdatedCode) {
      mailchimpOAuthSuccess({ mailchimpCode: code as string, rpId: user?.revenue_programs?.[0]?.id });
      setHasUpdatedCode(true);
    }
  }, [code, hasUpdatedCode, mailchimpOAuthSuccess, user, userLoading]);

  useEffect(() => {
    if (!userLoading && !isMailchimpOAuthLoading && !userError && !mailchimpOAuthError && hasUpdatedCode) {
      history.push(SETTINGS.INTEGRATIONS);
    }
  }, [hasUpdatedCode, history, isMailchimpOAuthLoading, mailchimpOAuthError, userError, userLoading]);

  return <GlobalLoading />;
}
