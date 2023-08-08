import { axe } from 'jest-axe';
import useContributionPageList from 'hooks/useContributionPageList';
import useUser from 'hooks/useUser';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import AddPage from './AddPage';
import { useHistory } from 'react-router-dom';
import { useAlert } from 'react-alert';
import { PLAN_LABELS } from 'constants/orgPlanConstants';

jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: jest.fn()
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));
jest.mock('components/common/Modal/AddPageModal/AddPageModal');
jest.mock('hooks/useContributionPageList');
jest.mock('hooks/useUser');

function tree() {
  return render(<AddPage />);
}

describe('AddPage', () => {
  const useAlertMock = useAlert as jest.Mock;
  const useContributionPageListMock = useContributionPageList as jest.Mock;
  const useHistoryMock = useHistory as jest.Mock;
  const useUserMock = useUser as jest.Mock;

  beforeEach(() => {
    useContributionPageListMock.mockReturnValue({ isLoading: false, pages: [] });
    useUserMock.mockReturnValue({ isLoading: false, user: { flags: [] } });
  });

  it('displays nothing if the user is not available in context', () => {
    useUserMock.mockReturnValue({ isLoading: true });
    tree();
    expect(document.body.textContent).toBe('');
  });

  it('displays a button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'New Page' })).toBeVisible();
  });

  describe('When the user has only one revenue program', () => {
    let createPage: jest.Mock;
    let push: jest.Mock;

    beforeEach(() => {
      createPage = jest.fn().mockImplementation(() => ({ id: 1 }));
      push = jest.fn();

      useContributionPageListMock.mockReturnValue({
        createPage,
        isLoading: false,
        newPageProperties: () => ({ mockPageProperties: true }),
        userCanCreatePage: () => true
      });
      useHistoryMock.mockReturnValue({ push });
      useUserMock.mockReturnValue({
        isLoading: false,
        user: {
          revenue_programs: [{ id: 1 }]
        }
      });
    });

    it('immediately creates a page when the button is clicked', async () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      await waitFor(() => expect(createPage).toBeCalled());
      expect(createPage.mock.calls).toEqual([[{ mockPageProperties: true, revenue_program: 1 }]]);
    });

    it('navigates to the page editor if creation succeeds', async () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      await waitFor(() => expect(push).toBeCalled());
      expect(push.mock.calls).toEqual([['/edit/pages/1/']]);
    });
  });

  describe('When the user has multiple revenue programs', () => {
    let createPage: jest.Mock;
    let push: jest.Mock;

    beforeEach(() => {
      createPage = jest.fn().mockImplementation(() => ({ id: 1 }));
      push = jest.fn();

      useContributionPageListMock.mockReturnValue({
        createPage,
        isLoading: false,
        newPageProperties: () => ({ mockPageProperties: true }),
        userCanCreatePage: () => true
      });
      useHistoryMock.mockReturnValue({ push });
      useUserMock.mockReturnValue({
        isLoading: false,
        user: {
          flags: [],
          revenue_programs: [
            { id: 1, name: 'rp-1' },
            { id: 2, name: 'rp-2' }
          ]
        }
      });
    });

    it('opens the add page modal when the button is clicked', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      expect(screen.getByTestId('mock-add-page-modal')).toBeInTheDocument();
    });

    it('creates a page when the user completes the add page modal', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      fireEvent.click(screen.getByText('onAddPage'));
      expect(createPage.mock.calls).toEqual([[{ mockPageProperties: true, revenue_program: 1 }]]);
    });

    it('shows the error in the modal if creation failed with a response', () => {
      createPage.mockImplementation(() => {
        // We're imitating Axios's errors.
        // eslint-disable-next-line no-throw-literal
        throw { response: { data: { errors: ['mock-error'] } } };
      });
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      fireEvent.click(screen.getByText('onAddPage'));
      expect(screen.getByTestId('outerError')).toHaveTextContent('mock-error');
    });

    it('shows a generic error if creation failed with no response data', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = jest.fn();

      useAlertMock.mockReturnValue({ error });
      createPage.mockImplementation(() => {
        throw new Error();
      });
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      fireEvent.click(screen.getByText('onAddPage'));
      expect(error.mock.calls).toEqual([
        ['There was an error and we could not create your new page. We have been notified.']
      ]);
      errorSpy.mockRestore();
    });

    it('navigates to the page editor if creation succeeds', async () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      fireEvent.click(screen.getByText('onAddPage'));
      await waitFor(() => expect(push).toBeCalled());
      expect(push.mock.calls).toEqual([['/edit/pages/1/']]);
    });
  });

  describe('When the user has exceeded the limit of the free plan', () => {
    beforeEach(() => {
      useContributionPageListMock.mockReturnValue({
        isLoading: false,
        userCanCreatePage: () => false
      });
      useUserMock.mockReturnValue({
        isLoading: false,
        user: {
          flags: [],
          organizations: [{ plan: { name: PLAN_LABELS.FREE } }],
          revenue_programs: [{ id: 'mock-rp-1' }]
        }
      });
    });

    it("shows a modal indicating they've hit the page limit", () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      expect(screen.getByText('Max Pages Reached')).toBeVisible();
    });

    it('recommends upgrading to the Core plan', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      expect(screen.getByTestId('recommendation')).toHaveTextContent('Check out Core.');
    });

    it('closes the modal if the user closes it', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      expect(screen.getByText('Max Pages Reached')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByText('Max Pages Reached')).not.toBeInTheDocument();
    });
  });

  describe('When the user has exceeded the limit of the Core plan', () => {
    beforeEach(() => {
      useContributionPageListMock.mockReturnValue({
        isLoading: false,
        userCanCreatePage: () => false
      });
      useUserMock.mockReturnValue({
        isLoading: false,
        user: {
          flags: [],
          organizations: [{ plan: { name: 'CORE' } }],
          revenue_programs: [{ id: 'mock-rp-1' }]
        }
      });
    });

    it("shows a modal indicating they've hit the page limit", () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      expect(screen.getByText('Max Pages Reached')).toBeVisible();
    });

    it('recommends upgrading to the Plus plan', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      expect(screen.getByTestId('recommendation')).toHaveTextContent('Check out Plus.');
    });

    it('closes the modal if the user closes it', () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'New Page' }));
      expect(screen.getByText('Max Pages Reached')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByText('Max Pages Reached')).not.toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
