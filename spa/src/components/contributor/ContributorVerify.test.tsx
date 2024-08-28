import Axios from 'ajax/axios';
import { VERIFY_TOKEN } from 'ajax/endpoints';
import { LS_CONTRIBUTOR, LS_CSRF_TOKEN, SS_CONTRIBUTOR } from 'appSettings';
import MockAdapter from 'axios-mock-adapter';
import { useHistory } from 'react-router-dom';
import { render, screen, waitFor } from 'test-utils';
import ContributorVerify from './ContributorVerify';
import { getRevenueProgramSlug } from 'utilities/getRevenueProgramSlug';
import { PORTAL } from 'routes';

jest.mock('utilities/getRevenueProgramSlug');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    search: ''
  }),
  useHistory: jest.fn()
}));

const newPortalEnabledRps = jest.fn();

jest.mock('appSettings', () => ({
  HUB_GA_V3_ID: 'mock-hub-ga-v3-id',
  LS_CONTRIBUTOR: 'mock-ls-contributor',
  LS_CSRF_TOKEN: 'mock-ls-csrf-token',
  SS_CONTRIBUTOR: 'mock-ss-contributor',
  get NEW_PORTAL_ENABLED_RPS() {
    return newPortalEnabledRps();
  }
}));

describe('ContributorVerify', () => {
  const axiosMock = new MockAdapter(Axios);
  const getRevenueProgramSlugMock = jest.mocked(getRevenueProgramSlug);
  const useHistoryMock = useHistory as jest.Mock;

  beforeEach(() => {
    newPortalEnabledRps.mockReturnValue([]);
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
      getRevenueProgramSlugMock.mockReturnValue('mock-rp-slug');
    });

    it('should do a soft redirect to CONTRIBUTOR_DASHBOARD if the RP is not in NEW_PORTAL_ENABLED_RPS', async () => {
      const locationReplaceSpy = jest.spyOn(window.location, 'replace');

      locationReplaceSpy.mockImplementation();
      newPortalEnabledRps.mockReturnValue(['other', 'other2']);
      render(<ContributorVerify />);
      await waitFor(() => {
        expect(useHistoryMock().replace).toHaveBeenCalledWith('/contributor/contributions/');
      });
      expect(locationReplaceSpy).not.toBeCalled();
    });

    it('should do a hard redirect to PORTAL.CONTRIBUTIONS if the RP is not in NEW_PORTAL_ENABLED_RPS', async () => {
      const locationReplaceSpy = jest.spyOn(window.location, 'replace');

      locationReplaceSpy.mockImplementation();
      newPortalEnabledRps.mockReturnValue(['other', 'other2', 'mock-rp-slug']);
      render(<ContributorVerify />);
      await waitFor(() => expect(locationReplaceSpy).toBeCalled());
      expect(locationReplaceSpy.mock.calls).toEqual([[PORTAL.CONTRIBUTIONS]]);
      expect(useHistoryMock().replace).not.toBeCalled();
    });

    it('should set contributor in local and session storage', async () => {
      render(<ContributorVerify />);

      await waitFor(() => {
        expect(window.localStorage.getItem(LS_CONTRIBUTOR)).toBe(JSON.stringify('mock-contributor'));
      });
      expect(window.sessionStorage.getItem(SS_CONTRIBUTOR)).toBe(JSON.stringify('mock-contributor'));
    });

    it('should set csrf token in local storage', async () => {
      render(<ContributorVerify />);
      await waitFor(() => {
        expect(window.localStorage.getItem(LS_CSRF_TOKEN)).toBe('mock-token');
      });
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
