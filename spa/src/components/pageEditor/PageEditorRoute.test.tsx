import { ReactChild } from 'react';
import { useParams } from 'react-router-dom';
import { render, screen } from 'test-utils';
import PageEditorRoute from './PageEditorRoute';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn()
}));
jest.mock('hooks/useEditablePage', () => ({
  EditablePageContextProvider({ children, pageId }: { children: ReactChild; pageId: number }) {
    return (
      <div data-testid="mock-editable-page-context-provider" data-page-id={pageId}>
        {children}
      </div>
    );
  }
}));
jest.mock('./PageEditor', () => () => <div data-testid="mock-page-editor" />);
jest.mock('./PageEditorTopbar', () => () => <div data-testid="mock-page-editor-topbar" />);

function tree() {
  return render(<PageEditorRoute />);
}

describe('PageEditorRoute', () => {
  const useParamsMock = useParams as jest.Mock;

  beforeEach(() => useParamsMock.mockReturnValue({ pageId: 123 }));

  it('renders an EditablePageContextProvider with the page ID in the route params', () => {
    tree();
    expect(screen.getByTestId('mock-editable-page-context-provider').dataset.pageId).toBe('123');
  });

  it('renders a PageEditorTopbar', () => {
    tree();
    expect(screen.getByTestId('mock-page-editor-topbar')).toBeInTheDocument();
  });

  it('renders a PageEditor', () => {
    tree();
    expect(screen.getByTestId('mock-page-editor')).toBeInTheDocument();
  });
});
