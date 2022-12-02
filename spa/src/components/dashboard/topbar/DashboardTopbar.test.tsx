import { render, screen, fireEvent } from 'test-utils';
import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';

import DashboardTopbar, { DashboardTopbarProps } from './DashboardTopbar';
import { CONTENT_SLUG } from 'routes';

jest.mock('components/authentication/logout');
jest.mock('hooks/useRequest');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));

const page = {
  name: 'Page Name',
  revenue_program: {
    slug: 'rev-prog-slug'
  },
  payment_provider: {},
  slug: 'page-slug',
  published_date: '2021-11-18T21:51:53Z'
};

const user = {
  email: 'mock@email.com'
};

function tree(props?: Partial<DashboardTopbarProps>) {
  return render(<DashboardTopbar page={page as any} user={user} {...props} />);
}

describe('DashboardTopbar', () => {
  const useHistoryMock = useHistory as jest.Mock;

  beforeEach(() => useHistoryMock.mockReturnValue({ replace: jest.fn() }));

  describe('When editPage is false', () => {
    it('shows an avatar menu', () => {
      tree({ isEditPage: false });
      expect(screen.getByRole('button', { name: 'Settings' })).toBeEnabled();
    });

    it('hides the grab link button', () => {
      tree({ isEditPage: false });
      expect(screen.queryByRole('button', { name: /grab link/i })).not.toBeInTheDocument();
    });

    it('shows the NRH logo', () => {
      tree({ isEditPage: false });
      // Has mobile and desktop logos
      expect(screen.getAllByAltText('News Revenue Hub Logo')).toHaveLength(2);
    });

    it('is accessible', async () => {
      const { container } = tree({ isEditPage: false });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When editPage is true', () => {
    it("doesn't show an avatar menu", () => {
      tree({ isEditPage: true });
      expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
    });

    it('shows the grab link button if the page is published', () => {
      tree({ isEditPage: true });
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /grab link/i })).toBeEnabled();
    });

    it("doesn't show the grab link button if the page isn't published", () => {
      tree({ isEditPage: true, page: { ...page, published_date: undefined } as any });
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /grab link/i })).not.toBeInTheDocument();
    });

    it('shows the page title if present in props', () => {
      tree({ isEditPage: true, page: page as any });
      expect(screen.getByText(page.name)).toBeVisible();
    });

    it('hides the page title if page is not passed in props', () => {
      tree({ isEditPage: true, page: undefined });
      expect(screen.queryByText(page.name)).not.toBeInTheDocument();
    });

    it('hides the page title if the page prop has no name', () => {
      tree({ isEditPage: true, page: { ...page, name: undefined } as any });
      expect(screen.queryByText(page.name)).not.toBeInTheDocument();
    });

    it('shows a back button', () => {
      tree({ isEditPage: true });
      expect(screen.getByRole('button', { name: 'Exit' })).toBeEnabled();
    });

    describe('When the back button is clicked', () => {
      it('goes back to the main dashboard if there are no changes in the updatedPage prop', () => {
        const historyReplaceMock = jest.fn();

        useHistoryMock.mockReturnValue({ replace: historyReplaceMock });
        tree({ isEditPage: true, updatedPage: {} });
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
        expect(historyReplaceMock).toHaveBeenCalledWith(CONTENT_SLUG);
      });

      it('shows an unsaved changes modal if there are changes in the updatedPage prop', () => {
        tree({ isEditPage: true, updatedPage: page as any });
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
        expect(screen.getByText('Unsaved Changes')).toBeVisible();
      });

      it("doesn't show an unsaved changes modal if the updatedPage prop is empty", () => {
        tree({ isEditPage: true, updatedPage: {} });
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
        expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      });

      it("doesn't show an unsaved changes modal if the updatedPage prop is undefined", () => {
        tree({ isEditPage: true, updatedPage: undefined });
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
        expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      });
    });

    it('is accessible', async () => {
      const { container } = tree({ isEditPage: true });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
