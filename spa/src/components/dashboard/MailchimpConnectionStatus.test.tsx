import useConnectMailchimp from 'hooks/useConnectMailchimp';
import usePreviousState from 'hooks/usePreviousState';
import { useSnackbar } from 'notistack';
import { fireEvent, render, screen } from 'test-utils';
import MailchimpConnectionStatus from './MailchimpConnectionStatus';
import useUser from 'hooks/useUser';

jest.mock('hooks/usePreviousState');
jest.mock('hooks/useUser');
jest.mock('components/common/Modal/AudienceListModal/AudienceListModal');
jest.mock('components/settings/Integration/IntegrationCard/MailchimpIntegrationCard/MailchimpModal/MailchimpModal');
jest.mock('hooks/useConnectMailchimp');
jest.mock('components/common/GlobalLoading/GlobalLoading');
jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

const mockMailchimpLists = [
  { id: '1', name: 'audience-1' },
  { id: '2', name: 'audience-2' }
];

const mockUser = { mockUser: true };

describe('MailchimpConnectionStatus', () => {
  const enqueueSnackbar = jest.fn();
  const setRefetchInterval = jest.fn();
  const useSnackbarMock = jest.mocked(useSnackbar);
  const usePreviousStateMock = jest.mocked(usePreviousState);
  const useConnectMailchimpMock = jest.mocked(useConnectMailchimp);
  const useUserMock = jest.mocked(useUser);

  function tree() {
    return render(<MailchimpConnectionStatus />);
  }

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar, closeSnackbar: jest.fn() });
    useUserMock.mockReturnValue({ user: mockUser } as any);
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('shows a loading status when Mailchimp connection is loading', () => {
    useConnectMailchimpMock.mockReturnValue({ isLoading: true } as any);
    tree();
    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
  });

  describe('Audience Selection modal', () => {
    it('should display Audience List modal if has audience list but none selected', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: undefined,
        audiences: mockMailchimpLists,
        setRefetchInterval
      } as any);
      tree();
      expect(screen.getByTestId('mock-audience-list-modal')).toBeInTheDocument();
    });

    it('should reset Mailchimp status refetch interval if has audience list but none selected', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: undefined,
        audiences: mockMailchimpLists,
        setRefetchInterval
      } as any);
      expect(setRefetchInterval).not.toHaveBeenCalled();
      tree();
      expect(setRefetchInterval).toHaveBeenCalledTimes(1);
      expect(setRefetchInterval).toHaveBeenCalledWith(false);
    });

    it('should not display Audience List modal if no audience list', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: undefined,
        audiences: undefined,
        setRefetchInterval
      } as any);
      tree();
      expect(setRefetchInterval).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mock-audience-list-modal')).not.toBeInTheDocument();
    });

    it('should not display Audience List modal if audience list is empty', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: undefined,
        audiences: [],
        setRefetchInterval
      } as any);
      tree();
      expect(setRefetchInterval).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mock-audience-list-modal')).not.toBeInTheDocument();
    });

    it('should not display Audience List modal if has audience list and has selected audience', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: '1',
        audiences: mockMailchimpLists,
        setRefetchInterval
      } as any);
      tree();
      expect(setRefetchInterval).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mock-audience-list-modal')).not.toBeInTheDocument();
    });
  });

  describe('Mailchimp Success modal', () => {
    it('should not display Mailchimp Success modal if audience selected and prev audience undefined', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: 'mock-audience-id'
      } as any);
      usePreviousStateMock.mockReturnValueOnce(undefined);
      tree();
      expect(screen.queryByTestId('mock-mailchimp-modal')).not.toBeInTheDocument();
    });

    it('should display Mailchimp Success modal if audience selected and prev audience null', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: 'mock-audience-id'
      } as any);
      usePreviousStateMock.mockReturnValueOnce(null);
      tree();

      const modal = screen.getByTestId('mock-mailchimp-modal');

      expect(modal).toBeInTheDocument();
    });

    it('should not display Mailchimp Success modal if audience not selected', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: undefined
      } as any);
      usePreviousStateMock.mockReturnValueOnce('whatever');
      tree();
      expect(screen.queryByTestId('mock-mailchimp-modal')).not.toBeInTheDocument();
    });

    it('should not display Mailchimp Success modal if audience and prev audience are the same', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: 'same-value'
      } as any);
      usePreviousStateMock.mockReturnValueOnce('same-value');
      tree();
      expect(screen.queryByTestId('mock-mailchimp-modal')).not.toBeInTheDocument();
    });

    it('should close Mailchimp Success modal if "onClose" is clicked', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: 'mock-audience-id'
      } as any);
      usePreviousStateMock.mockReturnValueOnce(null);
      tree();
      expect(screen.getByTestId('mock-mailchimp-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('mock-mailchimp-modal-close'));
      expect(screen.queryByTestId('mock-mailchimp-modal')).not.toBeInTheDocument();
    });

    it('should show a success message if Mailchimp Success modal is closed', () => {
      useConnectMailchimpMock.mockReturnValue({
        isLoading: false,
        selectedAudienceId: 'mock-audience-id',
        success: true
      } as any);
      usePreviousStateMock.mockReturnValueOnce(null);
      expect(enqueueSnackbar).not.toHaveBeenCalled();
      tree();
      fireEvent.click(screen.getByTestId('mock-mailchimp-modal-close'));
      expect(enqueueSnackbar).toHaveBeenCalledTimes(1);
      expect(enqueueSnackbar).toBeCalledWith(
        'You’ve successfully connected to Mailchimp! Your contributor data will sync automatically.',
        expect.objectContaining({
          persist: true
        })
      );
    });
  });
});
