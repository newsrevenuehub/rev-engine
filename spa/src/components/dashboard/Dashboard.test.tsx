import MockAdapter from 'axios-mock-adapter';
import { render, screen, within } from 'test-utils';
import { useLocation } from 'react-router-dom';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import Dashboard from './Dashboard';
import Axios from 'ajax/axios';
import { getStripeAccountLinkStatusPath } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import useFeatureFlags from 'hooks/useFeatureFlags';
import useUser from 'hooks/useUser';

jest.mock('elements/GlobalLoading');
jest.mock('hooks/useFeatureFlags');
jest.mock('hooks/useUser');
jest.mock('hooks/useRequest');
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useLocation: jest.fn()
}));

const useUserMockDefaults = {
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  user: {
    email: 'foo@bar.com',
    role_type: ['org_admin']
  }
};

describe('Dashboard', () => {
  const useFeatureFlagsMock = useFeatureFlags as jest.Mock;
  const useUserMock = useUser as jest.Mock;
  const useLocationMock = useLocation as jest.Mock;

  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    useFeatureFlagsMock.mockReturnValue({
      flags: [{ name: CONTENT_SECTION_ACCESS_FLAG_NAME }],
      isLoading: false,
      isError: false
    });
    useUserMock.mockReturnValue({ ...useUserMockDefaults });

    useLocationMock.mockReturnValue({
      pathname: CONTENT_SLUG,
      search: '',
      state: {},
      hash: ''
    });
  });

  afterEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });

  afterAll(() => axiosMock.restore());

  it('should display a user-dismissable system notification when Stripe Connect completes', async () => {
    const rpId = '1';
    useUserMock.mockReturnValue({
      ...useUserMockDefaults,
      user: {
        ...useUserMockDefaults.user,
        revenue_programs: [{ payment_provider_stripe_verified: false, id: rpId }]
      }
    });
    axiosMock.onPost(getStripeAccountLinkStatusPath(rpId)).reply(200, { requiresVerification: false });
    render(<Dashboard />);
    const notification = await screen.findByRole('status');
    expect(notification).toBeVisible();
    expect(within(notification).getByRole('heading', { name: 'Stripe Successfully Connected!' })).toBeVisible();
    expect(
      within(notification).getByText(
        'Stripe verification has been completed. Your contribution page can now be published!'
      )
    ).toBeVisible();
    within(notification).getByRole('button', { name: 'close notification' }).click();
    expect(notification).not.toBeInTheDocument();
  });
});
