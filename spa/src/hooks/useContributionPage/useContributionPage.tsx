import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { DELETE_PAGE, DRAFT_PAGE_DETAIL, LIST_PAGES, LIST_STYLES, PATCH_PAGE } from 'ajax/endpoints';
import SystemNotification from 'components/common/SystemNotification';
import { GENERIC_ERROR } from 'constants/textConstants';
import { Style } from 'hooks/useStyleList';
import { useSnackbar } from 'notistack';
import { useCallback } from 'react';
import { useAlert } from 'react-alert';
import urlJoin from 'url-join';
import { getUpdateSuccessMessage } from 'utilities/editPageGetSuccessMessage';
import { pageUpdateToFormData } from './pageUpdateToFormData';
import { ContributionPage } from './useContributionPage.types';

async function fetchPageById(pageId: number) {
  const { data } = await axios.get<ContributionPage>(urlJoin(LIST_PAGES, pageId.toString(), '/'));
  return data;
}

async function fetchPageBySlug(revenueProgramSlug: string, pageSlug: string) {
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

export interface UseContributionPageResult {
  /**
   * Deletes this page permanently. Not defined while the page is loading.
   */
  deletePage?: () => Promise<void>;
  /**
   * Last error that occurred interacting with the API.
   */
  error: UseQueryResult['error'];
  /**
   * Is data being fetched from the API?
   */
  isLoading: UseQueryResult['isLoading'];
  /**
   * Was there an error interacting with the API?
   */
  isError: UseQueryResult['isError'];
  /**
   * Manually updates data from the API.
   */
  refetch: UseQueryResult['refetch'];
  /**
   * Page data. Not defined while the page is loading.
   */
  page?: ContributionPage;
  /**
   * Saves changes to the page. Not defined while the page is loading.
   * @param data Updates to the page--does not need to include properties that aren't changing
   * @param screenshotBaseName Name to use for the screenshot to be saved; omit to not save a screenshot
   * @param elementToScreenshot Element to render as the screenshot; omit to not save a screenshot
   */
  updatePage?: (
    data: Partial<ContributionPage>,
    screenshotBaseName?: string,
    elementToScreenshot?: HTMLElement
  ) => Promise<void>;
}

export function useContributionPage(pageId?: number): UseContributionPageResult;
export function useContributionPage(revenueProgramSlug: string, pageSlug: string): UseContributionPageResult;

/**
 * Manages interactions with the API related to a single contribution page. In
 * many cases, you should use useEditablePageContext() instead.
 */
export function useContributionPage(revenueProgramSlugOrPageId?: number | string, pageSlug?: string) {
  const alert = useAlert();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const {
    data: page,
    error,
    isError,
    isLoading,
    refetch
  } = useQuery(
    ['contributionPage', revenueProgramSlugOrPageId, pageSlug],
    () => {
      switch (typeof revenueProgramSlugOrPageId) {
        case 'number':
          return fetchPageById(revenueProgramSlugOrPageId as number);
        case 'string':
          if (!pageSlug) {
            throw new Error('Both revenue program and page slugs must be provided');
          }

          return fetchPageBySlug(revenueProgramSlugOrPageId, pageSlug);
      }
    },
    { enabled: !!revenueProgramSlugOrPageId }
  );

  const deletePageMutation = useMutation(
    () => {
      if (!page) {
        throw new Error('Page is not yet defined');
      }

      return axios.delete(`${DELETE_PAGE}${page.id}/`);
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['pages'])
    }
  );

  const deletePage = useCallback(async () => {
    try {
      await deletePageMutation.mutateAsync();
    } catch (error) {
      // Unlike page updates, this call should never fail. We log it to Sentry,
      // show a generic message to the user, and rethrow so caller sees it and
      // take additional action if they want to.
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
      onSuccess: () => {
        queryClient.invalidateQueries(['pages']);
        queryClient.invalidateQueries({ queryKey: ['contributionPage', revenueProgramSlugOrPageId, pageSlug] });
      }
    }
  );

  const onSaveStylesError = () => {
    enqueueSnackbar('Style changes were not saved. Please wait and try again or changes will be lost.', {
      persist: true,
      content: (key: string, message: string) => (
        <SystemNotification id={key} message={message} header="Style Not Saved!" type="error" />
      )
    });
  };

  const updateStyleMutation = useMutation(
    (data: Partial<ContributionPage>) => {
      if (!page) {
        throw new Error('Page is not yet defined');
      }
      if (!data.styles || !data.styles.id) {
        // Should never happen
        throw new Error('Style is not yet defined');
      }

      return axios.patch<Style>(`${LIST_STYLES}${data.styles.id}/`, {
        ...data.styles,
        revenue_program: page.revenue_program?.id
      });
    },
    {
      onError: onSaveStylesError
    }
  );

  const createStyleMutation = useMutation(
    (data: Partial<ContributionPage>) => {
      if (!page) {
        throw new Error('Page is not yet defined');
      }
      if (!data.styles) {
        // Should never happen
        throw new Error('Style is not yet defined');
      }
      return axios.post<Style>(LIST_STYLES, {
        ...data.styles,
        // TODO: Handle style name creation/generation better
        name: (Math.random() + 1).toString(36).substring(4),
        revenue_program: page.revenue_program?.id
      });
    },
    {
      onError: onSaveStylesError
    }
  );

  const updatePage = useCallback(
    async (data: Partial<ContributionPage>, screenshotBaseName?: string, elementToScreenshot?: HTMLElement) => {
      // No error handling here to allow callers to implement their own
      // logic--they may not want an error notification at all, because the API
      // error might be a simple validation problem (we currently rely on the
      // API to do this validation for us). In that case, callers will not want
      // to report an error, just show validation errors instead.

      if (!page) {
        throw new Error('Page is not yet defined');
      }

      let styles: Style | undefined;
      if (data.styles) {
        if (data.styles?.id) {
          const { data: response } = await updateStyleMutation.mutateAsync(data);
          styles = response;
        } else {
          const { data: response } = await createStyleMutation.mutateAsync(data);
          styles = response;
        }
      }

      const formData = await pageUpdateToFormData(
        // Only add styles to data if it's not undefined
        { ...data, ...(styles && { styles }) },
        screenshotBaseName,
        elementToScreenshot
      );

      await updatePageMutation.mutateAsync(formData);
      alert.success(getUpdateSuccessMessage(page, data));
    },
    [alert, createStyleMutation, page, updatePageMutation, updateStyleMutation]
  );

  if (page) {
    return { deletePage, error, isError, isLoading, page, refetch, updatePage };
  }

  return { error, isError, isLoading, refetch };
}

export default useContributionPage;
