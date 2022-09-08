import { render, screen } from 'test-utils';
import Verify from './Verify';

jest.mock('components/Main', () => ({
  __esModule: true,
  useUserDataProviderContext: () => ({ userData: { email: 'test@test.com' } })
}));

it('should show the blue revengine logo', () => {
  render(<Verify />);
  const blueLogo = screen.getByTestId('blue-logo');
  expect(blueLogo).toBeInTheDocument();
});

it('should have heading - Create Your Free Account', () => {
  render(<Verify />);
  const title = screen.getByText('Verify Your Email Address');
  expect(title).toBeInTheDocument();
});

it('should contain Resend Verification Button', () => {
  render(<Verify />);
  const resendButton = screen.getByRole('button', { name: 'Resend Verification' });
  expect(resendButton).toBeInTheDocument();
});
