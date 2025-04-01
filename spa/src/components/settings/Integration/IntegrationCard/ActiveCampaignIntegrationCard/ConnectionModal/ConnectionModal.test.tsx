import { axe } from 'jest-axe';
import { act, fireEvent, render, screen, waitFor } from 'test-utils';
import { useConnectActiveCampaign } from 'hooks/useConnectActiveCampaign';
import ConnectionModal, { ConnectionModalProps, AC_URL_OR_TOKEN_VALIDATION_ERROR } from './ConnectionModal';

jest.mock('hooks/useConnectActiveCampaign');
jest.mock('./steps');

function tree(props?: Partial<ConnectionModalProps>) {
  return render(<ConnectionModal open onClose={jest.fn()} {...props} />);
}

describe('ConnectionModal', () => {
  const useConnectActiveCampaignMock = jest.mocked(useConnectActiveCampaign);
  let updateAccessTokenAndServerUrl: jest.Mock;

  beforeEach(() => {
    updateAccessTokenAndServerUrl = jest.fn();
    useConnectActiveCampaignMock.mockReturnValue({
      updateAccessTokenAndServerUrl,
      activecampaign_integration_connected: false,
      activecampaign_server_url: undefined,
      isError: false,
      isLoading: false
    });
  });

  it('shows nothing if not open', () => {
    tree({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a modal when open', () => {
    tree();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('calls its onClose prop when the modal is closed', () => {
    const onClose = jest.fn();

    tree({ onClose });
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toBeCalledTimes(1);
  });

  it('initially shows UserQuestion', () => {
    tree();
    expect(screen.getByTestId('mock-user-question')).toBeInTheDocument();
  });

  it('resets to UserQuestion when closing', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep false' }));
    expect(screen.getByTestId('mock-user-needed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'onClose' }));
    expect(screen.getByTestId('mock-user-question')).toBeInTheDocument();
  });

  it("shows UserNeeded after UserQuestion if the user says they haven't created a user", () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep false' }));
    expect(screen.getByTestId('mock-user-needed')).toBeInTheDocument();
  });

  it('calls its onClose prop if UserNeeded requests it', () => {
    const onClose = jest.fn();

    tree({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep false' }));
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'onClose' }));
    expect(onClose).toBeCalledTimes(1);
  });

  it("shows CreateUser after UserQuestion if the user says they've created a user", () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    expect(screen.getByTestId('mock-create-user')).toBeInTheDocument();
  });

  it('goes back to UserQuestion from CreateUser', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onPreviousStep' }));
    expect(screen.getByTestId('mock-user-question')).toBeInTheDocument();
  });

  it('shows GetApiKey after CreateUser', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    expect(screen.getByTestId('mock-get-api-key')).toBeInTheDocument();
  });

  it('goes back to CreateUser from GetApiKey', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onPreviousStep' }));
    expect(screen.getByTestId('mock-create-user')).toBeInTheDocument();
  });

  it('shows EnterApiKey after GetApiKey', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    expect(screen.getByTestId('mock-enter-api-key')).toBeInTheDocument();
  });

  it('goes back to GetApiKey from EnterApiKey', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onPreviousStep' }));
    expect(screen.getByTestId('mock-get-api-key')).toBeInTheDocument();
  });

  it("updates the revenue program's API key and server URL after receiving it from EnterApiKey", async () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onSetKeyAndUrl' }));
    expect(updateAccessTokenAndServerUrl.mock.calls).toEqual([
      [{ accessToken: 'mock-api-key', serverUrl: 'mock-server-url' }]
    ]);

    // Let the component update.
    await act(() => Promise.resolve());
  });

  it('sets a generic error message on EnterApiKey if generically fails', async () => {
    updateAccessTokenAndServerUrl.mockRejectedValue(new Error());
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onSetKeyAndUrl' }));
    await waitFor(() => expect(updateAccessTokenAndServerUrl).toBeCalledTimes(1));
    expect(screen.getByTestId('mock-enter-api-key-error')).toHaveTextContent(
      'Failed to save API information. Please try again.'
    );
  });

  it('sets a specific error message on EnterApiKey if the API key or server URL is invalid', async () => {
    updateAccessTokenAndServerUrl.mockRejectedValue({
      response: { data: { non_field_errors: [AC_URL_OR_TOKEN_VALIDATION_ERROR] } }
    });
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onSetKeyAndUrl' }));
    await waitFor(() => expect(updateAccessTokenAndServerUrl).toBeCalledTimes(1));
    expect(screen.getByTestId('mock-enter-api-key-error')).toHaveTextContent(
      'Invalid API information. Please confirm API URL and key and try again.'
    );
  });

  it('shows Connected if updating the API key and server URL succeeds', async () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onSetKeyAndUrl' }));
    await screen.findByTestId('mock-connected');
    expect(screen.getByTestId('mock-connected')).toBeInTheDocument();
  });

  it('calls its onClose prop if Connected requests it', async () => {
    const onClose = jest.fn();

    useConnectActiveCampaignMock.mockReturnValue({
      updateAccessTokenAndServerUrl,
      activecampaign_integration_connected: false,
      activecampaign_server_url: 'mock-server-url',
      isError: false,
      isLoading: false
    });
    tree({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep true' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onNextStep' }));
    fireEvent.click(screen.getByRole('button', { name: 'onSetKeyAndUrl' }));
    await screen.findByTestId('mock-connected');
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'onClose' }));
    expect(onClose).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
