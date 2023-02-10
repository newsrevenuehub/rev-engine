import { act, renderHook } from '@testing-library/react-hooks';
import { ReactNode } from 'react';
import { EditablePageContext } from './useEditablePage';
import { useEditablePageBatch } from './useEditablePageBatch';

const setPageChanges = jest.fn();
let updatedPagePreview: any;

const TestEditablePageContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <EditablePageContext.Provider
      value={{
        setPageChanges,
        deletePage: jest.fn(),
        isError: false,
        isLoading: false,
        pageChanges: {},
        updatedPagePreview: updatedPagePreview as any
      }}
    >
      {children}
    </EditablePageContext.Provider>
  );
};

describe('useEditablePageBatch', () => {
  const tree = () => renderHook(() => useEditablePageBatch(), { wrapper: TestEditablePageContextProvider });

  beforeEach(() => {
    updatedPagePreview = {
      mockUpdatedPagePreview: true
    };
    setPageChanges.mockReset();
  });

  describe('addBatchChange', () => {
    it('adds a change to the batch preview', () => {
      const { result } = tree();

      act(() => result.current.addBatchChange({ header_link: 'test' }));
      expect(result.current.batchPreview).toEqual({ ...updatedPagePreview, header_link: 'test' });
    });

    it('overwrites previous changes in the batch preview', () => {
      const { result } = tree();

      act(() => {
        result.current.addBatchChange({ header_link: 'test' });
        result.current.addBatchChange({ header_link: 'test2' });
      });
      expect(result.current.batchPreview).toEqual({ ...updatedPagePreview, header_link: 'test2' });
    });
  });

  describe('batchHasChanges', () => {
    it('is false initially', () => {
      const { result } = tree();

      expect(result.current.batchHasChanges).toBe(false);
    });

    it('is true when addBatchChange() is called', () => {
      const { result } = tree();

      act(() => result.current.addBatchChange({ header_link: 'test' }));
      expect(result.current.batchHasChanges).toBe(true);
    });

    it('is true when a batch change has an undefined value', () => {
      const { result } = tree();

      act(() => {
        result.current.addBatchChange({ header_link: 'test' });
        result.current.addBatchChange({ header_link: undefined });
      });
      expect(result.current.batchHasChanges).toBe(true);
    });
  });

  describe('batchPreview', () => {
    it('is undefined if the editable page preview is undefined', () => {
      updatedPagePreview = undefined;

      const { result } = tree();

      expect(result.current.batchPreview).toBe(undefined);
    });

    it('is the editable page preview initially', () => {
      const { result } = tree();

      expect(result.current.batchPreview).toEqual(updatedPagePreview);
    });
  });

  describe('commitBatch', () => {
    // In the tests below, separate act() calls are needed so that commitBatch
    // updates.

    it('updates the editable page context', () => {
      const { result } = tree();

      act(() => result.current.addBatchChange({ header_link: 'test' }));
      act(() => result.current.commitBatch());
      expect(setPageChanges).toBeCalledTimes(1);

      // The hook uses the functional setter so we have to call it.

      expect(setPageChanges.mock.calls[0][0]({ existing: true })).toEqual({
        existing: true,
        header_link: 'test'
      });
    });

    it('resets the batch preview', () => {
      const { result } = tree();

      act(() => result.current.addBatchChange({ header_link: 'test' }));
      act(() => result.current.commitBatch());
      expect(result.current.batchPreview).toEqual(updatedPagePreview);
    });

    it('causes batchHasChanges to be false', () => {
      const { result } = tree();

      act(() => result.current.addBatchChange({ header_link: 'test' }));
      expect(result.current.batchHasChanges).toBe(true);
      act(() => result.current.commitBatch());
      expect(result.current.batchHasChanges).toBe(false);
    });

    it('does nothing if called again without any new changes made', () => {
      const { result } = tree();

      act(() => result.current.addBatchChange({ header_link: 'test' }));
      act(() => result.current.commitBatch());
      expect(setPageChanges).toBeCalled();
      setPageChanges.mockClear();
      act(() => result.current.commitBatch());
      expect(setPageChanges).not.toBeCalled();
    });
  });

  describe('resetBatch', () => {
    it('resets the batch preview', () => {
      const { result } = tree();

      act(() => {
        result.current.addBatchChange({ header_link: 'test' });
        result.current.resetBatch();
      });
      expect(result.current.batchPreview).toEqual(updatedPagePreview);
    });

    it('causes batchHasChanges to be false', () => {
      const { result } = tree();

      act(() => {
        result.current.addBatchChange({ header_link: 'test' });
        result.current.resetBatch();
      });
      expect(result.current.batchHasChanges).toBe(false);
    });

    it('causes commitBatch to do nothing if called after it', () => {
      const { result } = tree();

      act(() => {
        result.current.addBatchChange({ header_link: 'test' });
        result.current.resetBatch();
        result.current.commitBatch();
      });
      expect(setPageChanges).not.toBeCalled();
    });
  });
});
