import { useMutation } from '@tanstack/react-query';
import queryString from 'query-string';
import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import axios from 'ajax/axios';
import { MAILCHIMP_OAUTH_SUCCESS } from 'ajax/endpoints';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';
import { CONTENT_SLUG } from 'routes';

async function postMailchimpOAuthSuccess(code?: string, rpId?: number) {
  const result = await axios.post(MAILCHIMP_OAUTH_SUCCESS, { mailchimp_oauth_code: code, revenue_program: rpId });
  return result;
}

// This is an interstitial page we use solely to call `postMailchimpOAuthSuccess` to
// send to the BE the Mailchimp connection code. Redirect to /pages after completion.
export default function MailchimpOAuthSuccess() {
  const history = useHistory();
  const { search } = useLocation();
  const { code } = queryString.parse(search);
  const { user, isError: userError, isLoading: userLoading } = useUser();

  const {
    mutate: mailchimpOAuthSuccess,
    isLoading: isMailchimpOAuthLoading,
    isError: mailchimpOAuthError
  } = useMutation(({ mailchimpCode, rpId }: { mailchimpCode?: string; rpId?: number }) => {
    return postMailchimpOAuthSuccess(mailchimpCode, rpId);
  });

  useEffect(() => {
    if (user && !userLoading)
      mailchimpOAuthSuccess({ mailchimpCode: code as string, rpId: user?.revenue_programs?.[0]?.id });
  }, [code, mailchimpOAuthSuccess, user, userLoading]);

  useEffect(() => {
    if (!userLoading && !isMailchimpOAuthLoading && !userError && !mailchimpOAuthError) {
      history.push(CONTENT_SLUG);
    }
  }, [history, isMailchimpOAuthLoading, mailchimpOAuthError, userError, userLoading]);

  return <GlobalLoading />;
}
