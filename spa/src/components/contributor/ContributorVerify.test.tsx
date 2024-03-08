import Axios from 'ajax/axios';
import { VERIFY_TOKEN } from 'ajax/endpoints';
import { LS_CONTRIBUTOR, LS_CSRF_TOKEN, SS_CONTRIBUTOR } from 'appSettings';
import MockAdapter from 'axios-mock-adapter';
import { useHistory } from 'react-router-dom';
import { render, screen, waitFor } from 'test-utils';
import ContributorVerify from './ContributorVerify';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    search: ''
  }),
  useHistory: jest.fn()
}));

describe('ContributorVerify', () => {
  const axiosMock = new MockAdapter(Axios);
  const useHistoryMock = useHistory as jest.Mock;

  beforeEach(() => {
    useHistoryMock.mockReturnValue({ replace: jest.fn() });
  });

  afterEach(() => {
    axiosMock.reset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterAll(() => {
    axiosMock.restore();
  });

  describe('Loading state', () => {
    it('should show loading', () => {
      render(<ContributorVerify />);
      expect(screen.getByText('Looking for your contributions...')).toBeInTheDocument();
    });

    it('should not redirect', () => {
      const replace = jest.fn();
      useHistoryMock.mockReturnValue({ replace });

      render(<ContributorVerify />);
      expect(screen.getByText('Looking for your contributions...')).toBeInTheDocument();
      expect(replace).not.toHaveBeenCalled();
    });
  });

  describe('Verify success (when response is 200)', () => {
    beforeEach(() => {
      axiosMock.onPost(VERIFY_TOKEN).reply(200, { contributor: 'mock-contributor', csrftoken: 'mock-token' });
    });

    it('should redirect to dashboard', async () => {
      render(<ContributorVerify />);
      await waitFor(() => {
        expect(useHistoryMock().replace).toHaveBeenCalledWith('/contributor/contributions/');
      });
    });

    it('should set contributor in local and session storage', async () => {
      render(<ContributorVerify />);

      await waitFor(() => {
        expect(window.localStorage.getItem(LS_CONTRIBUTOR)).toBe(JSON.stringify('mock-contributor'));
      });
      expect(window.sessionStorage.getItem(SS_CONTRIBUTOR)).toBe(JSON.stringify('mock-contributor'));
    });
  });

  describe('Verify failed', () => {
    beforeEach(() => {
      axiosMock.onPost(VERIFY_TOKEN).reply(400);
    });

    it('should render could not verify message', async () => {
      render(<ContributorVerify />);

      await waitFor(() => {
        expect(screen.getByText(/We were unable to log you in./i)).toBeInTheDocument();
      });
      expect(
        screen.getByText(/Magic links have short expiration times. If your link expired/i, {
          exact: false
        })
      ).toBeInTheDocument();
    });

    it('should render link to contributor entry', async () => {
      render(<ContributorVerify />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /click here/i })).toHaveAttribute('href', '/contributor/');
      });
    });
  });
});
