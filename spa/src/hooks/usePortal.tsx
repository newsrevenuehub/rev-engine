import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { GET_MAGIC_LINK, LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { DASHBOARD_SUBDOMAINS } from 'appSettings';
import { AxiosError } from 'axios';
import SystemNotification from 'components/common/SystemNotification';
import { ContributionPage } from 'hooks/useContributionPage';
import useSubdomain from 'hooks/useSubdomain';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

export type PortalFormValues = {
  email: string;
};

async function fetchPage(rpSlug: string): Promise<ContributionPage> {
  try {
    const { data } = await axios.get(LIVE_PAGE_DETAIL, { params: { revenue_program: rpSlug } });

    return data;
  } catch (error) {
    // Log it for Sentry and rethrow, which should cause the generic error
    // message to appear.
    console.error(error);
    throw error;
  }
}

async function postMagicLink({ email, subdomain }: { email: string; subdomain: string }) {
  const result = await axios.post(GET_MAGIC_LINK, { email, subdomain });
  return result;
}

export default function usePortal() {
  const subdomain = useSubdomain();
  const enablePageFetch = !DASHBOARD_SUBDOMAINS.includes(subdomain);
  const { enqueueSnackbar } = useSnackbar();
  const [error, setError] = useState<{ email?: string[] }>({});

  const { data: page, isFetched } = useQuery(['getPage'], () => fetchPage(subdomain), {
    enabled: enablePageFetch
  });

  const {
    mutate: sendMagicLink,
    isLoading,
    isSuccess
  } = useMutation(
    ({ email }: PortalFormValues) => {
      return postMagicLink({ email, subdomain });
    },
    {
      onError: (error) => {
        if ((error as AxiosError).response?.status === 429) {
          setError({ email: ['Too many attempts. Try again in one minute.'] });
        } else if ((error as AxiosError).response?.data?.email) {
          setError((error as AxiosError).response?.data);
        } else {
          enqueueSnackbar('There’s been a problem sending your magic link. Please try again.', {
            persist: true,
            content: (key: string, message: string) => (
              <SystemNotification id={key} message={message} header="Error sending email" type="error" />
            )
          });
        }
      }
    }
  );

  return {
    page,
    pageIsFetched: isFetched,
    enablePageFetch,
    sendMagicLink,
    magicLinkIsLoading: isLoading,
    magicLinkIsSuccess: isSuccess,
    magicLinkError: error
  };
}
