import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AxiosError } from 'axios';
import axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { ContributionPage } from './useContributionPage';

export interface UsePublishedPageResult {
  /**
   * Last error that occurred interacting with the API.
   */
  error: UseQueryResult['error'];
  /**
   * Was there an error interacting with the API?
   */
  isError: UseQueryResult['isError'];
  /**
   * Is data being fetched from the API?
   */
  isLoading: UseQueryResult['isLoading'];
  /**
   * The contribution page, once loaded.
   */
  page: ContributionPage;
}

async function fetchPage(revenueProgramSlug: string, pageSlug: string) {
  const { data } = await axios.get<ContributionPage>(LIVE_PAGE_DETAIL, {
    params: { revenue_program: revenueProgramSlug, page: pageSlug }
  });
  return data;
}

/**
 * Loads the published version of a contribution page in read-only state.
 */
export function usePublishedPage(revenueProgramSlug: string, pageSlug: string) {
  // We want Tanstack Query's retry behavior when initially loading, but
  // otherwise we never want to refetch the page, because it might cause
  // unwanted rerenders while the user is filling out the form.
  //
  // See https://tanstack.com/query/v4/docs/react/guides/disabling-queries

  const {
    data: page,
    error,
    isLoading,
    isError,
    refetch
  } = useQuery([`published-page-${revenueProgramSlug}-${pageSlug}`], () => fetchPage(revenueProgramSlug, pageSlug), {
    enabled: false,
    retry(failureCount, error) {
      // If we 404 (e.g. the page doesn't exist, or isn't published yet), fail
      // immediately. Otherwise try 3 times.

      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 404) {
        return false;
      }

      return failureCount < 3;
    }
  });

  useEffect(() => {
    if (refetch) {
      refetch();
    }
  }, [refetch]);

  return { error, isLoading, isError, page };
}
