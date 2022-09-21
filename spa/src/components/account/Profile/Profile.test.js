import userEvent from '@testing-library/user-event';
import Axios from 'ajax/axios';
import { CUSTOMIZE_ACCOUNT_ENDPOINT } from 'ajax/endpoints';
import MockAdapter from 'axios-mock-adapter';
import { UserContext } from 'components/UserContext';
import { useHistory } from 'react-router-dom';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import Profile from './Profile';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));
jest.mock('./ProfileForm');

function tree() {
  return render(
    <UserContext.Provider value={{ setUser: jest.fn(), user: { id: 'mock-user-id' } }}>
      <Profile />
    </UserContext.Provider>
  );
}

describe('Profile', () => {
  const axiosMock = new MockAdapter(Axios);
  let historyPushMock;

  beforeEach(() => {
    axiosMock.onPatch(`users/mock-user-id/${CUSTOMIZE_ACCOUNT_ENDPOINT}`).reply(204);
    historyPushMock = jest.fn();
    useHistory.mockReturnValue({ push: historyPushMock });
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  it('displays the profile form', () => {
    tree();
    expect(screen.getByTestId('mock-profile-form')).toBeInTheDocument();
  });

  describe('when the profile form is submitted', () => {
    it('disables the form while the request is pending', () => {
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit'));
      expect(screen.getByTestId('mock-profile-form-disabled')).toBeInTheDocument();
    });

    it('PATCHes the user customization endpoint', async () => {
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit'));
      await waitFor(() => expect(axiosMock.history.patch).toHaveLength(1));
      expect(axiosMock.history.patch[0]).toEqual(
        expect.objectContaining({
          data: JSON.stringify({
            first_name: 'mock-first-name',
            last_name: 'mock-last-name',
            job_title: 'mock-job-title',
            organization_name: 'mock-company-name',
            organization_tax_status: 'nonprofit'
          }),
          url: `users/mock-user-id/${CUSTOMIZE_ACCOUNT_ENDPOINT}`
        })
      );
    });

    it('does not send a job title property if the user did not specify it', async () => {
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit-without-job-title'));
      await waitFor(() => expect(axiosMock.history.patch).toHaveLength(1));
      expect(axiosMock.history.patch[0]).toEqual(
        expect.objectContaining({
          data: JSON.stringify({
            first_name: 'mock-first-name',
            last_name: 'mock-last-name',
            // No job_title
            organization_name: 'mock-company-name',
            organization_tax_status: 'nonprofit'
          }),
          url: `users/mock-user-id/${CUSTOMIZE_ACCOUNT_ENDPOINT}`
        })
      );
    });

    it('redirects to / after a successful PATCH', async () => {
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit'));
      await waitFor(() => expect(historyPushMock).toBeCalled());
      expect(historyPushMock.mock.calls).toEqual([['/']]);
    });

    it('displays an error message and re-enables the form if the PATCH fails', async () => {
      axiosMock.reset();
      axiosMock.onPatch().networkError();
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit'));
      await waitFor(() => expect(screen.getByText('An Error Occurred')).toBeVisible());
      expect(screen.queryByTestId('mock-profile-form-disabled')).not.toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
