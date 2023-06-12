import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import { EditablePageContext, EditablePageContextResult } from 'hooks/useEditablePage';
import { fireEvent, render, screen } from 'test-utils';
import PageEditorTopbar from './PageEditorTopbar';
import { CONTENT_SLUG } from 'routes';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));
jest.mock('components/common/Button/PublishButton/PublishButton');

jest.mock('./PageName/PageName');

const page = {
  name: 'Page Name',
  revenue_program: {
    slug: 'rev-prog-slug'
  },
  payment_provider: {},
  slug: 'page-slug',
  published_date: '2021-11-18T21:51:53Z'
};

function tree(context?: Partial<EditablePageContextResult>) {
  return render(
    <EditablePageContext.Provider
      value={{
        deletePage: jest.fn(),
        isError: false,
        isLoading: false,
        page: page as any,
        pageChanges: {},
        setPageChanges: jest.fn(),
        ...context
      }}
    >
      <PageEditorTopbar />
    </EditablePageContext.Provider>
  );
}

describe('PageEditorTopbar', () => {
  const useHistoryMock = useHistory as jest.Mock;

  beforeEach(() => useHistoryMock.mockReturnValue({ replace: jest.fn() }));

  it('shows the grab link button if the page is published', () => {
    tree();
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grab link/i })).toBeEnabled();
  });

  it("doesn't show the grab link button if the page isn't published", () => {
    tree({ page: { ...page, published_date: undefined } as any });
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /grab link/i })).not.toBeInTheDocument();
  });

  it('shows the page name', () => {
    tree();
    expect(screen.getByTestId('mock-page-name')).toBeVisible();
  });

  it('shows a publish button', () => {
    tree();
    expect(screen.getByTestId('mock-publish-button')).toBeVisible();
  });

  it('shows a back button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Exit' })).toBeEnabled();
  });

  describe('When the back button is clicked', () => {
    it('goes back to the main dashboard if there are no page changes in context', () => {
      const historyReplaceMock = jest.fn();

      useHistoryMock.mockReturnValue({ replace: historyReplaceMock });
      tree({ pageChanges: {} });
      fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
      expect(historyReplaceMock).toHaveBeenCalledWith(CONTENT_SLUG);
    });

    it('shows an unsaved changes modal if there are page changes in context', () => {
      tree({ pageChanges: page as any });
      fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
      expect(screen.getByText('Unsaved Changes')).toBeVisible();
    });

    it("doesn't show an unsaved changes modal if there are no page changes in context", () => {
      tree({ pageChanges: {} });
      fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
