import { useMutation, useQueryClient } from '@tanstack/react-query';
import queryString from 'query-string';
import { useEffect, useState } from 'react';
import { useAlert } from 'react-alert';
import { useHistory, useLocation } from 'react-router-dom';

import axios from 'ajax/axios';
import { MAILCHIMP_OAUTH_SUCCESS } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';
import GlobalLoading from 'elements/GlobalLoading';
import useConnectMailchimp from 'hooks/useConnectMailchimp';
import { SETTINGS } from 'routes';

// This is an interstitial page we use solely to call `postMailchimpOAuthSuccess` to
// send to the BE the Mailchimp connection code. Redirect to /pages after completion.
export default function MailchimpOAuthSuccess() {
  const alert = useAlert();
  const history = useHistory();
  const { search } = useLocation();
  const queryClient = useQueryClient();
  const { code } = queryString.parse(search);
  const { setRefetchInterval, isLoading: mailchimpLoading, revenueProgram } = useConnectMailchimp();
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
        queryClient.invalidateQueries({ queryKey: ['revenueProgramMailchimpStatus'] });
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
    if (revenueProgram && !mailchimpLoading && !hasUpdatedCode) {
      mailchimpOAuthSuccess({ mailchimpCode: code as string, rpId: revenueProgram.id });
      setHasUpdatedCode(true);
    }
  }, [code, hasUpdatedCode, mailchimpOAuthSuccess, mailchimpLoading, revenueProgram]);

  return <GlobalLoading />;
}
