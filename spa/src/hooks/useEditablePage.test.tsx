import userEvent from '@testing-library/user-event';
import { act, cleanup, render, screen, waitFor } from 'test-utils';
import { useContributionPage } from './useContributionPage';
import { EditablePageContextProvider, useEditablePageContext } from './useEditablePage';

jest.mock('./useContributionPage');

const page = { currency: {}, testPage: true };
const testChange = { graphic: 'test-graphic', testPage: false };
const testElement = document.createElement('div');

function TestConsumer() {
  const {
    deletePage,
    error,
    isError,
    isLoading,
    page,
    pageChanges,
    savePageChanges,
    setPageChanges,
    updatedPagePreview
  } = useEditablePageContext();

  return (
    <>
      {error && <div data-testid="error">{error.toString()}</div>}
      {isError && <div data-testid="is-error" />}
      {isLoading && <div data-testid="is-loading" />}
      <div data-testid="page">{JSON.stringify(page)}</div>
      <div data-testid="page-changes">{JSON.stringify(pageChanges)}</div>
      <div data-testid="updated-page-preview">{JSON.stringify(updatedPagePreview)}</div>
      <button onClick={deletePage}>deletePage</button>
      {savePageChanges && (
        <button
          onClick={async () => {
            // This try/catch is so that we can test error conditions gracefully.
            try {
              await savePageChanges(undefined, 'test-screenshot-name', testElement);
            } catch (error) {}
          }}
        >
          savePageChanges
        </button>
      )}
      {savePageChanges && (
        <button
          onClick={() =>
            savePageChanges(
              { graphic: 'test-graphic-override', name: 'test-name' },
              'test-screenshot-name',
              testElement
            )
          }
        >
          savePageChanges with override
        </button>
      )}
      <button onClick={() => setPageChanges(testChange)}>setPageChanges</button>
    </>
  );
}

function tree() {
  return render(
    <EditablePageContextProvider pageId={123}>
      children
      <TestConsumer />
    </EditablePageContextProvider>
  );
}

describe('EditablePageContextProvider', () => {
  const useContributionPageMock = useContributionPage as jest.Mock;

  beforeEach(() => useContributionPageMock.mockReturnValue({}));

  it('displays its children', () => {
    tree();
    expect(screen.getByText('children')).toBeVisible();
  });

  it('passes through the deletePage prop from useContributionPage', () => {
    const deletePage = jest.fn();

    useContributionPageMock.mockReturnValue({ deletePage });
    tree();
    expect(deletePage).not.toBeCalled();
    userEvent.click(screen.getByText('deletePage'));
    expect(deletePage).toBeCalledTimes(1);
  });

  it('passes through the error prop from useContributionPage', () => {
    const error = new Error('test error');

    useContributionPageMock.mockReturnValue({ error });
    tree();
    expect(screen.getByTestId('error')).toBeInTheDocument();
  });

  it('passes through the isError prop from useContributionPage', () => {
    useContributionPageMock.mockReturnValue({ isError: true });
    tree();
    expect(screen.getByTestId('is-error')).toBeInTheDocument();
    cleanup();
    useContributionPageMock.mockReturnValue({ isError: false });
    tree();
    expect(screen.queryByTestId('is-error')).not.toBeInTheDocument();
  });

  it('passes through the isLoading prop from useContributionPage', () => {
    useContributionPageMock.mockReturnValue({ isLoading: true });
    tree();
    expect(screen.getByTestId('is-loading')).toBeInTheDocument();
    cleanup();
    useContributionPageMock.mockReturnValue({ isLoading: false });
    tree();
    expect(screen.queryByTestId('is-loading')).not.toBeInTheDocument();
  });

  it('passes through the page prop from useContributionPage', () => {
    useContributionPageMock.mockReturnValue({ page });
    tree();
    expect(screen.getByTestId('page')).toHaveTextContent(JSON.stringify(page));
  });

  it('initially sets the pageChanges prop to an empty object', () => {
    tree();
    expect(screen.getByTestId('page-changes')).toHaveTextContent('{}');
  });

  it('initially sets the updatedPagePreview prop to the page', () => {
    useContributionPageMock.mockReturnValue({ page });
    tree();
    expect(screen.getByTestId('updated-page-preview')).toHaveTextContent(JSON.stringify(page));
  });

  describe('If the page has no currency set', () => {
    it('sets the currency to $ in the updatedPagePreview prop', () => {
      useContributionPageMock.mockReturnValue({ page: { ...page, currency: null } });
      tree();
      expect(screen.getByTestId('updated-page-preview')).toHaveTextContent(
        JSON.stringify({ currency: { code: 'USD', symbol: '$' }, testPage: true })
      );
    });

    it("doesn't change the page prop", () => {
      useContributionPageMock.mockReturnValue({ page: { ...page, currency: null } });
      tree();
      expect(screen.getByTestId('page')).toHaveTextContent(JSON.stringify({ ...page, currency: null }));
    });
  });

  describe('When setPageChanges is called', () => {
    it('updates the pageChanges prop', () => {
      tree();
      userEvent.click(screen.getByText('setPageChanges'));
      expect(screen.getByTestId('page-changes')).toHaveTextContent(JSON.stringify(testChange));
    });

    it('updates the updatedPagePreview prop', () => {
      useContributionPageMock.mockReturnValue({ page });
      tree();
      userEvent.click(screen.getByText('setPageChanges'));
      expect(screen.getByTestId('updated-page-preview')).toHaveTextContent(JSON.stringify({ ...page, ...testChange }));
    });

    it('does not update the page in the backend', () => {
      const updatePage = jest.fn();

      useContributionPageMock.mockReturnValue({ updatePage });
      tree();
      userEvent.click(screen.getByText('setPageChanges'));
      expect(updatePage).not.toBeCalled();
    });
  });

  describe('When savePageChanges is called', () => {
    let updatePage: jest.Mock;

    beforeEach(() => {
      updatePage = jest.fn();
      useContributionPageMock.mockReturnValue({ page, updatePage });
    });

    it('updates the page in the backend', async () => {
      tree();
      userEvent.click(screen.getByText('setPageChanges'));
      expect(updatePage).not.toBeCalled();
      userEvent.click(screen.getByText('savePageChanges'));
      expect(updatePage.mock.calls).toEqual([[testChange, 'test-screenshot-name', testElement]]);

      // Let the pending update complete.
      await act(() => Promise.resolve());
    });

    it('does nothing if the pageChanges prop and changes argument is empty', () => {
      tree();
      userEvent.click(screen.getByText('savePageChanges'));
      expect(updatePage).not.toBeCalled();
    });

    it('merges the changes argument with the pageChanges prop', async () => {
      tree();
      userEvent.click(screen.getByText('setPageChanges'));
      userEvent.click(screen.getByText('savePageChanges with override'));
      expect(updatePage.mock.calls).toEqual([
        [{ ...testChange, graphic: 'test-graphic-override', name: 'test-name' }, 'test-screenshot-name', testElement]
      ]);

      // Let the pending update complete.
      await act(() => Promise.resolve());
    });

    describe('While updating the page in the backend is pending', () => {
      it('preserves the pageChanges prop', async () => {
        const updatePage = jest.fn().mockImplementation(() => new Promise(() => {}));

        useContributionPageMock.mockReturnValue({ updatePage });
        tree();
        userEvent.click(screen.getByText('setPageChanges'));

        const change = screen.getByTestId('page-changes').textContent;

        userEvent.click(screen.getByText('savePageChanges'));
        await waitFor(() => expect(updatePage).toBeCalled());
        expect(screen.getByTestId('page-changes').textContent).toBe(change);
      });

      it('preserves the updatedPagePreview prop', async () => {
        const updatePage = jest.fn().mockImplementation(() => new Promise(() => {}));

        useContributionPageMock.mockReturnValue({ updatePage });
        tree();
        userEvent.click(screen.getByText('setPageChanges'));

        const change = screen.getByTestId('updated-page-preview').textContent;

        userEvent.click(screen.getByText('savePageChanges'));
        await waitFor(() => expect(updatePage).toBeCalled());
        expect(screen.getByTestId('updated-page-preview')).toHaveTextContent(change!);
      });
    });

    describe('If updating the page in the backend succeeds', () => {
      it('resets the pageChanges prop', async () => {
        tree();
        userEvent.click(screen.getByText('setPageChanges'));
        expect(screen.getByTestId('page-changes').textContent).not.toBe('{}');
        userEvent.click(screen.getByText('savePageChanges'));
        await waitFor(() => expect(screen.getByTestId('page-changes')).toHaveTextContent('{}'));
      });

      it('resets the updatedPagePreview prop', async () => {
        tree();
        userEvent.click(screen.getByText('setPageChanges'));
        expect(screen.getByTestId('updated-page-preview').textContent).not.toBe('{}');
        userEvent.click(screen.getByText('savePageChanges'));
        await waitFor(() => expect(screen.getByTestId('updated-page-preview')).toHaveTextContent('{}'));
      });
    });

    describe('If updating the page in the backend fails', () => {
      it('preserves the pageChanges prop', async () => {
        const updatePage = jest.fn().mockRejectedValue(new Error());

        useContributionPageMock.mockReturnValue({ updatePage });
        tree();
        userEvent.click(screen.getByText('setPageChanges'));

        const change = screen.getByTestId('page-changes').textContent;

        userEvent.click(screen.getByText('savePageChanges'));
        await waitFor(() => expect(updatePage).toBeCalled());
        expect(screen.getByTestId('page-changes').textContent).toBe(change);
      });

      it('preserves the updatedPagePreview prop', async () => {
        const updatePage = jest.fn().mockRejectedValue(new Error());

        useContributionPageMock.mockReturnValue({ updatePage });
        tree();
        userEvent.click(screen.getByText('setPageChanges'));

        const change = screen.getByTestId('updated-page-preview').textContent;

        userEvent.click(screen.getByText('savePageChanges'));
        await waitFor(() => expect(updatePage).toBeCalled());
        expect(screen.getByTestId('updated-page-preview')).toHaveTextContent(change!);
      });
    });
  });

  it('deletes the page in the backend when deletePage is called', () => {
    const deletePage = jest.fn();

    useContributionPageMock.mockReturnValue({ deletePage, page });
    tree();
    expect(deletePage).not.toBeCalled();
    userEvent.click(screen.getByText('deletePage'));
    expect(deletePage).toBeCalledTimes(1);
  });
});
