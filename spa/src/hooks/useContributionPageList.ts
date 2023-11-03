import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';

import { LIST_PAGES } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { GENERIC_ERROR } from 'constants/textConstants';
import { SIGN_IN } from 'routes';
import { ContributionPage } from './useContributionPage';
import { Organization, User } from './useUser.types';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';

export interface CreatePageProperties extends Partial<Omit<ContributionPage, 'revenue_program'>> {
  // These are required when creating a page.
  name: string;
  // Unlike a retrieved page, the revenue_program property is required, and
  // should be the ID of the revenue program that the page will belong to.
  revenue_program: number;
}

export interface UseContributionPageListResult {
  /**
   * Creates a new page. Resolves to the API response after creation.
   * @param data - initial properties of the page
   */
  createPage: (properties: CreatePageProperties) => Promise<ContributionPage>;
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
   * Returns properties for a new page that ensure its name will be
   * unique based on pages loaded. This function doesn't require that `pages` be
   * loaded first, however.
   */
  newPageProperties: (revenueProgramName: string) => Pick<CreatePageProperties, 'name'>;
  /**
   * Pages available to the user. While fetching or if there was an error
   * retrieving pages, this is undefined.
   */
  pages?: ContributionPage[];
  /**
   * Returns whether a user can create a new page, e.g. if they are under the
   * page limit of their organization. If pages are being fetched, this returns `false`.
   */
  userCanCreatePage: (user: User) => boolean;
  /**
   * Returns whether an Organization can have a new page published (limit hasn't been reached).
   * If pages are being fetched, this returns `false`.
   */
  orgHasPublishPageLimit: (org: Organization) => boolean;
}

async function fetchPages() {
  const { data } = await axios.get<ContributionPage[]>(LIST_PAGES);
  return data;
}

/**
 * Manages access to all pages that the user has access to, and has functions
 * for creating new pages. For Hub admins and superusers, this will be all
 * pages. For other users, it will be pages to belong to the revenue program the
 * user has access to.
 */
function useContributionPageList(): UseContributionPageListResult {
  const alert = useAlert();
  const history = useHistory();
  const queryClient = useQueryClient();
  const {
    data: pages,
    error,
    isLoading,
    isError
  } = useQuery(['pages'], fetchPages, {
    // if it's an authentication error, we don't want to retry. if it's some other
    // error we'll retry up to 1 time.
    retry: (failureCount, error) => {
      return (error as Error).name !== 'AuthenticationError' && failureCount < 1;
    },
    // Retain data for 2 minutes, same as useUser. Mutations will invalidate
    // the cache immediately.
    staleTime: 120000,
    onError: (error) => {
      if ((error as Error).name === 'AuthenticationError') {
        history.push(SIGN_IN);
      } else {
        console.error(error);
        alert.error(GENERIC_ERROR);
      }
    }
  });
  const createPageMutation = useMutation(
    (properties: CreatePageProperties) => axios.post<ContributionPage>(LIST_PAGES, properties),
    { onSuccess: () => queryClient.invalidateQueries(['pages']) }
  );
  const createPage = useCallback(
    async (properties: CreatePageProperties) => {
      const { data } = await createPageMutation.mutateAsync(properties);

      return data;
    },
    [createPageMutation]
  );
  const newPageProperties = useCallback(
    (revenueProgramName: string) => {
      const rpPages = (pages ?? []).filter(({ revenue_program }) => revenue_program?.name === revenueProgramName);
      const pagesSize = rpPages.length + 1;
      const names = rpPages.map(({ name }) => name);
      let number = pagesSize;
      let name = `Page ${number}`;

      while (names.includes(name)) {
        number++;
        name = `Page ${number}`;
      }
      return { name };
    },
    [pages]
  );
  const userCanCreatePage = useCallback(
    (user: User) => {
      // Hub admins and superusers can always create pages.

      if ([USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE].includes(user.role_type[0])) {
        return true;
      }

      // If we don't know how many pages exist, assume no.

      if (!pages) {
        return false;
      }

      // Look at the user's first organization's plan limit. Only Hub admins
      // have more than one organization.

      return pages.length < user.organizations[0].plan.page_limit;
    },
    [pages]
  );
  const orgHasPublishPageLimit = useCallback(
    (org: Organization) => {
      // If we don't know how many pages exist, assume no.
      if (!pages) {
        return false;
      }

      // Filter pages by the organization and then filter by published date.
      // Compare the currently published pages with the organization's plan limit
      // We don't consider dates here; e.g. if a page has a publish date a year away,
      // it still counts as published.
      return (
        pages.filter(
          (page) =>
            // Filter pages by organization
            page.revenue_program.organization.id === org?.id &&
            // Filter pages that have been published
            !!page.published_date
        ).length < org.plan.publish_limit
      );
    },
    [pages]
  );

  return { createPage, error, isError, isLoading, newPageProperties, pages, userCanCreatePage, orgHasPublishPageLimit };
}

export default useContributionPageList;
