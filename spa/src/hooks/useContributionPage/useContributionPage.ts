import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAlert } from 'react-alert';
import axios from 'ajax/axios';
import { DELETE_PAGE, DRAFT_PAGE_DETAIL, PATCH_PAGE } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';
import { getUpdateSuccessMessage } from 'utilities/editPageGetSuccessMessage';
import { pageUpdateToFormData } from './pageUpdateToFormData';
import { ContributionPage } from './useContributionPage.types';

async function fetchPage(revenueProgramSlug: string, pageSlug: string) {
  // We use this endpoint because it allows lookup of a page by RP name and page
  // slug.

  const { data } = await axios.get<ContributionPage>(DRAFT_PAGE_DETAIL, {
    params: {
      revenue_program: revenueProgramSlug,
      page: pageSlug
    }
  });
  return data;
}

export function useContributionPage(revenueProgramSlug: string, pageSlug: string) {
  const alert = useAlert();
  const queryClient = useQueryClient();
  const {
    data: page,
    error,
    isError,
    isLoading,
    refetch
  } = useQuery(['contributionPage', revenueProgramSlug, pageSlug], () => fetchPage(revenueProgramSlug, pageSlug));

  const deletePageMutation = useMutation(() => {
    if (!page) {
      throw new Error('Page is not yet defined');
    }

    return axios.delete(`${DELETE_PAGE}${page.id}/`);
  });

  const deletePage = useCallback(async () => {
    try {
      await deletePageMutation.mutateAsync();
    } catch (error) {
      // Log it to Sentry, show a generic message to the user, and rethrow so
      // caller sees it and take additional action if they want to.
      console.error(error);
      alert.error(GENERIC_ERROR);
      throw error;
    }
  }, [alert, deletePageMutation]);

  const updatePageMutation = useMutation(
    (data: FormData) => {
      if (!page) {
        throw new Error('Page is not yet defined');
      }

      return axios.patch(`${PATCH_PAGE}${page.id}/`, data);
    },
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contributionPage', revenueProgramSlug, pageSlug] })
    }
  );

  const updatePage = useCallback(
    async (data: Partial<ContributionPage>, elementToScreenshot?: HTMLElement) => {
      // No error handling here to allow callers to implement their own
      // logic--they may not want an error notification at all.

      if (!page) {
        throw new Error('Page is not yet defined');
      }

      const formData = await pageUpdateToFormData(data, elementToScreenshot);

      await updatePageMutation.mutateAsync(formData);
      alert.success(getUpdateSuccessMessage(page, data));
    },
    [alert, page, updatePageMutation]
  );

  if (page) {
    return { deletePage, error, isError, isLoading, page, refetch, updatePage };
  }

  return { error, isError, isLoading, refetch };
}

export default useContributionPage;
