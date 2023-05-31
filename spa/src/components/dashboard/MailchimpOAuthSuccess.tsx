import { useMutation, useQueryClient } from '@tanstack/react-query';
import queryString from 'query-string';
import { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import axios from 'ajax/axios';
import { MAILCHIMP_OAUTH_SUCCESS } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';
import { useAlert } from 'react-alert';
import { SETTINGS } from 'routes';

// This is an interstitial page we use solely to call `postMailchimpOAuthSuccess` to
// send to the BE the Mailchimp connection code. Redirect to /pages after completion.
export default function MailchimpOAuthSuccess() {
  const alert = useAlert();
  const history = useHistory();
  const { search } = useLocation();
  const queryClient = useQueryClient();
  const { code } = queryString.parse(search);
  const { user, setRefetchInterval, isLoading: userLoading } = useUser();
  const [hasUpdatedCode, setHasUpdatedCode] = useState(false);
  const { mutate: mailchimpOAuthSuccess } = useMutation(
    ({ mailchimpCode, rpId }: { mailchimpCode?: string; rpId?: number }) => {
      return postMailchimpOAuthSuccess(mailchimpCode, rpId);
    },
    {
      onSuccess: () => {
        // Start refreshing the user every 10 seconds, so that when they finish
        // connecting Mailchimp, we see that and can present the audience
        // selection modal to them.

        setRefetchInterval(10000);
        history.push(SETTINGS.INTEGRATIONS);
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    }
  );

  async function postMailchimpOAuthSuccess(code?: string, rpId?: number) {
    try {
      const result = await axios.post(MAILCHIMP_OAUTH_SUCCESS, { mailchimp_oauth_code: code, revenue_program: rpId });
      return result;
    } catch (error) {
      console.error(error);
      alert.error(GENERIC_ERROR);
    }
  }

  useEffect(() => {
    if (user && !userLoading && !hasUpdatedCode) {
      mailchimpOAuthSuccess({ mailchimpCode: code as string, rpId: user?.revenue_programs?.[0]?.id });
      setHasUpdatedCode(true);
    }
  }, [code, hasUpdatedCode, mailchimpOAuthSuccess, user, userLoading]);

  return <GlobalLoading />;
}
