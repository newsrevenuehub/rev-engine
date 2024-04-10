import { useContributionPage } from 'hooks/useContributionPage';
import { useParams } from 'react-router-dom';
import { render, screen } from 'test-utils';
import { PageEditorRedirect } from './PageEditorRedirect';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  Redirect({ to }: { to: string }) {
    return <div data-testid="mock-redirect">{to}</div>;
  }
}));
jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('hooks/useContributionPage');

function tree() {
  return render(<PageEditorRedirect />);
}

describe('PageEditorRedirect', () => {
  const useContributionPageMock = useContributionPage as jest.Mock;
  const useParamsMock = useParams as jest.Mock;

  beforeEach(() => {
    useContributionPageMock.mockReturnValue({});
    useParamsMock.mockReturnValue({ pageSlug: 'mock-page-slug', revProgramSlug: 'mock-rp-slug' });
  });

  it('asks for the contribution page with the slugs set in router params', () => {
    tree();
    expect(useContributionPageMock).toBeCalledWith('mock-rp-slug', 'mock-page-slug');
  });

  it('shows a loading indicator while the page is not available', () => {
    useContributionPageMock.mockReturnValue({ page: undefined });
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  it('redirects to /edit/pages/:page-id when the page is available', () => {
    useContributionPageMock.mockReturnValue({ page: { id: 123 } });
    tree();
    expect(screen.getByTestId('mock-redirect')).toHaveTextContent('/edit/pages/123');
  });
});
