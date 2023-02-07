import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { useHistory as useHistoryImport } from 'react-router-dom';
import { axe } from 'jest-axe';
import Axios from 'ajax/axios';
import { CUSTOMIZE_ACCOUNT_ENDPOINT } from 'ajax/endpoints';
import { render, screen, waitFor } from 'test-utils';
import useUserImport from 'hooks/useUser';
import Profile from './Profile';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));
jest.mock('./ProfileForm');
jest.mock('hooks/useUser');

function tree() {
  return render(<Profile />);
}

const useUser = useUserImport as jest.Mock;
const useHistory = useHistoryImport as jest.Mock;

describe('Profile', () => {
  const axiosMock = new MockAdapter(Axios);
  let historyPushMock: jest.Mock;

  beforeEach(() => {
    axiosMock.onPatch(`users/mock-user-id/${CUSTOMIZE_ACCOUNT_ENDPOINT}`).reply(204);
    historyPushMock = jest.fn();
    useHistory.mockReturnValue({ push: historyPushMock });
    useUser.mockReturnValue({ loading: false, refetch: jest.fn(), user: { id: 'mock-user-id' } });
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  it('includes step information for users of assistive technology', () => {
    tree();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('displays the profile form', () => {
    tree();
    expect(screen.getByTestId('mock-profile-form')).toBeInTheDocument();
  });

  describe('when the profile form is submitted', () => {
    it('disables the form while the request is pending', async () => {
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit'));
      expect(screen.getByTestId('mock-profile-form-disabled')).toBeInTheDocument();

      // Wait for the request to finish to avoid an act() warning.
      await waitFor(() => expect(axiosMock.history.patch.length).toBe(1));
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
            organization_name: 'mock-company-name',
            fiscal_status: 'mock-tax-status',
            job_title: 'mock-job-title',
            organization_tax_id: '987654321'
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
            fiscal_status: 'mock-tax-status',
            organization_tax_id: '987654321'
          }),
          url: `users/mock-user-id/${CUSTOMIZE_ACCOUNT_ENDPOINT}`
        })
      );
    });

    it('refetches the user then redirects to / after a successful PATCH', async () => {
      const refetch = jest.fn();

      useUser.mockReturnValue({ refetch, loading: false, user: { id: 'mock-user-id' } });
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit'));
      await waitFor(() => expect(historyPushMock).toBeCalled());
      expect(historyPushMock.mock.calls).toEqual([['/']]);
      expect(refetch).toBeCalledTimes(1);
    });

    it('displays an error message and re-enables the form if the PATCH fails', async () => {
      axiosMock.reset();
      axiosMock.onPatch().networkError();
      tree();
      userEvent.click(screen.getByText('mock-profile-form-submit'));
      await waitFor(() => expect(screen.getByText('Network Error')).toBeVisible());
      expect(screen.queryByTestId('mock-profile-form-disabled')).not.toBeInTheDocument();
    });

    describe('With Fiscal Sponsor information', () => {
      it('PATCHes the user customization endpoint', async () => {
        tree();
        userEvent.click(screen.getByText('mock-profile-form-fiscal-sponsor'));
        await waitFor(() => expect(axiosMock.history.patch).toHaveLength(1));
        expect(axiosMock.history.patch[0]).toEqual(
          expect.objectContaining({
            data: JSON.stringify({
              first_name: 'mock-first-name',
              last_name: 'mock-last-name',
              organization_name: 'mock-company-name',
              fiscal_status: 'fiscally sponsored',
              job_title: 'mock-job-title',
              organization_tax_id: '987654321',
              fiscal_sponsor_name: 'mock-sponsor-name'
            }),
            url: `users/mock-user-id/${CUSTOMIZE_ACCOUNT_ENDPOINT}`
          })
        );
      });
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
