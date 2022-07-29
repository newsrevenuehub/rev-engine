import { render, screen } from 'test-utils';
import Verify from './Verify';

it('should show the blue revengine logo', () => {
  render(<Verify />);
  const blueLogo = screen.queryByTestId('blue-logo');
  expect(blueLogo).toBeInTheDocument();
});

it('should have heading - Create Your Free Account', () => {
  render(<Verify />);
  const title = screen.queryByText('Verify Your Email Address');
  expect(title).toBeInTheDocument();
});

it('should contain Resend Verification Button', () => {
  render(<Verify />);
  const resendButton = screen.getByRole('button', { name: 'Resend Verification' });
  expect(resendButton).toBeInTheDocument();
});
