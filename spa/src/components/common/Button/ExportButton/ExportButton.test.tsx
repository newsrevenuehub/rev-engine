import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { axe } from 'jest-axe';
import { act, fireEvent, render, screen, waitFor } from 'test-utils';
import Axios from 'ajax/axios';
import { useSnackbar } from 'notistack';

import { CONTRIBUTIONS, EMAIL_CONTRIBUTIONS } from 'ajax/endpoints';

import ExportButton from './ExportButton';

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

jest.mock('components/ReauthContext', () => ({
  ...jest.requireActual('components/ReauthContext'),
  useReauthContext: () => ({ getReauth: jest.fn() })
}));

describe('ExportButton', () => {
  const axiosMock = new MockAdapter(Axios);
  const useSnackbarMock = useSnackbar as jest.Mock;
  const enqueueSnackbar = jest.fn();

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ enqueueSnackbar });
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  function tree() {
    return render(<ExportButton transactions={1234} email="mock-email" />);
  }

  async function openModal() {
    const button = screen.getByRole('button', { name: /Export/i });

    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
  }

  it('should render an enabled export button', () => {
    tree();

    const button = screen.getByRole('button', { name: /Export/i });
    expect(button).toBeEnabled();
  });

  it('should open export modal when the export button is clicked', async () => {
    tree();
    await openModal();
  });

  it('should disable the export button if export is confirmed in modal', async () => {
    tree();
    await openModal();

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();

    // Let pending update finish.

    await act(() => Promise.resolve());
  });

  it('should show success system notification if export is confirmed in modal and succeeds', async () => {
    tree();
    axiosMock.onPost(`${CONTRIBUTIONS}${EMAIL_CONTRIBUTIONS}`).reply(200);
    await openModal();

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    await waitFor(() =>
      expect(enqueueSnackbar).toBeCalledWith(
        'Your contributions export is in progress and will be sent to your email address when complete.',
        expect.objectContaining({
          persist: true
        })
      )
    );
  });

  it('should show error system notification if export is confirmed in modal and fails', async () => {
    tree();
    axiosMock.onPost().networkError();
    await openModal();

    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    await waitFor(() =>
      expect(enqueueSnackbar).toBeCalledWith(
        'There’s been a problem with your contributions export. Please try again.',
        expect.objectContaining({
          persist: true
        })
      )
    );
  });

  it('should show tooltip on the export button if it is disabled', async () => {
    tree();
    axiosMock.onPost(`${CONTRIBUTIONS}${EMAIL_CONTRIBUTIONS}`).reply(200);
    await openModal();

    fireEvent.click(screen.getByTestId('modal-export-button'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();

    const buttonWrapper = screen.getByTestId('export-button-wrapper');
    userEvent.hover(buttonWrapper);

    await waitFor(() => {
      expect(screen.getByText(/Export is being sent/i)).toBeInTheDocument();
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
