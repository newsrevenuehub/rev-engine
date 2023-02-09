import { useCallback, useMemo, useState } from 'react';
import { ContributionPage } from './useContributionPage/useContributionPage.types';
import { useEditablePageContext } from './useEditablePage';

export interface UseEditablePageBatchResult {
  /**
   * Adds a change to the batch. This overrides previous values set in the
   * batch. i.e. addBatchChange({ name: 'foo' }), then addBatchChange({ name:
   * 'bar' }), will result ultimately in changing name to 'bar'.
   */
  addBatchChange: (changes: Partial<ContributionPage>) => void;
  /**
   * Are there actually changes in the batch?
   */
  batchHasChanges: boolean;
  /**
   * A preview of the page object if commit() was called. This is undefined if
   * `updatedPagePreview` in the editable page context is undefined, e.g. while
   * the underlying page is being loaded from the API.
   */
  batchPreview?: ContributionPage;
  /**
   * Commits changes to the editable page context and resets changes in the
   * batch. This updates `pageChanges` only. It doesn not save changes to the
   * API.
   */
  commitBatch: () => void;
  /**
   * Removes all changes in this batch.
   */
  resetBatch: () => void;
}

/**
 * This hook allows storing a set of pending changes to a contribution page
 * which can either be committed or discarded. Each invocation of this hook owns
 * a separate set of changes.
 */
export function useEditablePageBatch(): UseEditablePageBatchResult {
  const { setPageChanges, updatedPagePreview } = useEditablePageContext();
  const [batchChanges, setBatchChanges] = useState<Partial<ContributionPage>>({});
  const addBatchChange = useCallback(
    (value: Partial<ContributionPage>) => setBatchChanges((existing) => ({ ...existing, ...value })),
    []
  );
  const batchPreview = useMemo(() => {
    if (!updatedPagePreview) {
      return undefined;
    }

    return { ...updatedPagePreview, ...batchChanges };
  }, [batchChanges, updatedPagePreview]);
  const commitBatch = useCallback(() => {
    // Don't do anything if there's nothing to commit.

    if (Object.keys(batchChanges).length === 0) {
      return;
    }

    setPageChanges((value) => ({ ...value, ...batchChanges }));
    setBatchChanges({});
  }, [batchChanges, setPageChanges]);
  const resetBatch = useCallback(() => setBatchChanges({}), []);

  return {
    addBatchChange,
    batchHasChanges: !!updatedPagePreview && Object.keys(batchChanges).length > 0,
    batchPreview,
    commitBatch,
    resetBatch
  };
}
