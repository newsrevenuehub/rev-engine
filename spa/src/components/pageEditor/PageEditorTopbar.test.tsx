import { axe } from 'jest-axe';
import { EditablePageContext, EditablePageContextResult } from 'hooks/useEditablePage';
import { render, screen } from 'test-utils';
import PageEditorTopbar from './PageEditorTopbar';

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

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
