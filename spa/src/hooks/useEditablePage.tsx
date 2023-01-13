import PropTypes, { InferProps } from 'prop-types';
import { createContext, useState, useContext, Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { ContributionPage, useContributionPage, UseContributionPageResult } from './useContributionPage';

/**
 * Properties provided to consumers of useEditablePageContext().
 */
export interface EditablePageContextResult {
  /**
   * Deletes the page from the API.
   */
  deletePage: UseContributionPageResult['deletePage'];
  /**
   * Most recent error with the API, if any.
   */
  error?: UseContributionPageResult['error'];
  /**
   * Did an error occur with the most recent API interaction?
   */
  isError: UseContributionPageResult['isError'];
  /**
   * Is the context interacting with the API--for instance, fetching the page or
   * making an update?
   */
  isLoading: UseContributionPageResult['isLoading'];
  /**
   * Page as it currently exists in the backend. Is undefined while it is
   * fetched from the API.
   */
  page?: ContributionPage;
  /**
   * Pending changes to the page. This should not contain any properties that
   * are not being changed. After savePageChanges completes, this is reset.
   */
  pageChanges: Partial<ContributionPage>;
  /**
   * Saves changes stored in `pageChanges` to the API. If successful, this will
   * also update `page` and set `pageChanges` to an empty object. The first
   * argument allows saving changes immediately without using setPageChanges().
   * See the `updatePage` function returned by `useContributionPage` for the
   * last two args this function takes.
   */
  savePageChanges?: (
    changes?: Partial<ContributionPage>,
    screenshotBaseName?: string,
    elementToScreenshot?: HTMLElement
  ) => Promise<void>;
  /**
   * Makes a change to `pageChanges` but *does not persist it to the API*. This
   * works identically to the setter returned by `React.useState()`, so most
   * changes should occur using the function version of the call.
   */
  setPageChanges: Dispatch<SetStateAction<Partial<ContributionPage>>>;
  /**
   * Reflects what the page object would look like if `changes` were saved.
   * Essentially a memoized spread of {...page, ...changes}, but with some
   * additional normalizing (see code for what's going on). Is undefined if
   * `page` is undefined.
   */
  updatedPagePreview?: ContributionPage;
}

export const EditablePageContext = createContext<EditablePageContextResult>({
  deletePage: () => {
    throw new Error('EditablePageContext must be used inside a EditablePageContextProvider');
  },
  isError: false,
  isLoading: true,
  pageChanges: {},
  setPageChanges: () => {
    throw new Error('EditablePageContext must be used inside a EditablePageContextProvider');
  }
});

export const useEditablePageContext = () => useContext(EditablePageContext);

const EditablePageContextProviderPropTypes = {
  children: PropTypes.node.isRequired,
  pageId: PropTypes.number.isRequired
};

/**
 * Provides a shared context for making changes to a single contribution page.
 */
export function EditablePageContextProvider(props: InferProps<typeof EditablePageContextProviderPropTypes>) {
  const { children, pageId } = props;
  const { deletePage, error, isError, isLoading, page, updatePage } = useContributionPage(pageId);
  const [pageChanges, setPageChanges] = useState<EditablePageContextResult['pageChanges']>({});

  const updatedPagePreview = useMemo(() => {
    if (!page) {
      return;
    }

    // `page` may have a null (not undefined) currency property if Stripe hasn't
    // been connected yet. We want to force it to always at least contain a
    // plausible currency symbol while the user is editing.
    //
    // We should never have this logic on a live page--Stripe should always be
    // connected in that case.

    const result = { ...page, ...pageChanges };

    if (!result.currency) {
      result.currency = { code: 'USD', symbol: '$' };
    }

    return result;
  }, [page, pageChanges]);
  const savePageChanges = useCallback(
    async (changes: Partial<ContributionPage> = {}, screenshotBaseName?: string, elementToScreenshot?: HTMLElement) => {
      if (!updatePage) {
        // Should never happen--see logic below.
        throw new Error('updatePage is not set');
      }

      // If there are no changes to save, don't bother making an API request.
      // Need to return a promise to match the return type of updatePage().

      if (Object.keys(pageChanges).length === 0 && Object.keys(changes).length === 0) {
        return Promise.resolve();
      }

      const result = updatePage({ ...pageChanges, ...changes }, screenshotBaseName, elementToScreenshot);

      setPageChanges({});
      return result;
    },
    [updatePage, pageChanges]
  );

  const context: EditablePageContextResult = {
    deletePage,
    error,
    isError,
    isLoading,
    page,
    pageChanges,
    setPageChanges,
    updatedPagePreview
  };

  if (updatePage) {
    context.savePageChanges = savePageChanges;
  }

  return <EditablePageContext.Provider value={context}>{children}</EditablePageContext.Provider>;
}

EditablePageContextProvider.propTypes = EditablePageContextProviderPropTypes;
