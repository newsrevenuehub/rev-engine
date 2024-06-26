import MockAdapter from 'axios-mock-adapter';
import { axe } from 'jest-axe';
import Axios from 'ajax/axios';
import { VERIFY_EMAIL_REQUEST_ENDPOINT } from 'ajax/endpoints';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import Verify from './Verify';

function tree() {
  return render(<Verify />);
}

describe('Verify', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet(VERIFY_EMAIL_REQUEST_ENDPOINT).reply(200);
  });

  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  it('shows the blue NRE logo', () => {
    tree();
    expect(screen.getByTestId('blue-logo')).toBeVisible();
  });

  it('shows a verification heading', () => {
    tree();
    expect(screen.getByText('Verify Your Email Address')).toBeVisible();
  });

  it('shows an enabled Resend Verification button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Resend Verification' })).toBeVisible();
  });

  it('makes a GET request to resend the email when the resend button is clicked', async () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'Resend Verification' }));
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(axiosMock.history.get[0].url).toBe(VERIFY_EMAIL_REQUEST_ENDPOINT);
  });

  describe('If GETting to resend the email was successful', () => {
    it('shows a success message', async () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'Resend Verification' }));
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(screen.getByText('Verification email has been successfully sent.')).toBeVisible();
    });

    it('disables the resend button', async () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'Resend Verification' }));
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(screen.getByRole('button', { name: 'Resend Verification' })).toBeDisabled();
    });
  });

  describe('If GETting to resend the email fails', () => {
    beforeEach(() => {
      axiosMock.reset();
      axiosMock.onGet(VERIFY_EMAIL_REQUEST_ENDPOINT).reply(400, { detail: 'mock-error-message' });
    });

    it('shows an error message', async () => {
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'Resend Verification' }));
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(screen.getByText('mock-error-message')).toBeVisible();
    });

    it('enables the resend button', async () => {
      jest.resetAllMocks();
      tree();
      fireEvent.click(screen.getByRole('button', { name: 'Resend Verification' }));
      await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
      expect(screen.getByRole('button', { name: 'Resend Verification' })).toBeEnabled();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
