import { render, screen } from 'test-utils';
import Verify from './Verify';

it('should show the blue revengine logo', () => {
  render(<Verify />);
  expect(screen.getByTestId('blue-logo')).toBeInTheDocument();
});

it('should have heading - Create Your Free Account', () => {
  render(<Verify />);
  expect(screen.getByText('Verify Your Email Address')).toBeInTheDocument();
});

it('should contain Resend Verification Button', () => {
  render(<Verify />);
  expect(screen.getByRole('button', { name: 'Resend Verification' })).toBeInTheDocument();
});
