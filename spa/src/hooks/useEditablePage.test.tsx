import userEvent from '@testing-library/user-event';
import { cleanup, render, screen } from 'test-utils';
import { useContributionPage } from './useContributionPage';
import { EditablePageContextProvider, useEditablePageContext } from './useEditablePage';

jest.mock('./useContributionPage');

const page = { currency: {}, testPage: true };
const testChange = { graphic: 'test-graphic', testPage: false };

function TestConsumer() {
  const { deletePage, error, isError, isLoading, page, pageChanges, setPageChanges, updatedPagePreview } =
    useEditablePageContext();

  return (
    <>
      {error && <div data-testid="error">{error.toString()}</div>}
      {isError && <div data-testid="is-error" />}
      {isLoading && <div data-testid="is-loading" />}
      <div data-testid="page">{JSON.stringify(page)}</div>
      <div data-testid="page-changes">{JSON.stringify(pageChanges)}</div>
      <div data-testid="updated-page-preview">{JSON.stringify(updatedPagePreview)}</div>
      <button onClick={deletePage}>deletePage</button>
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
    it.todo('updates the page in the backend');
    it.todo('does nothing if the pageChanges prop and changes argument is empty');
    it.todo('merges the changes argument with the pageChanges prop');
    it.todo('resets the pageChanges prop');
    it.todo('resets the updatedPagePreview prop');
  });
});
