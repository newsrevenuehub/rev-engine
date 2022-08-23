import { render, screen } from 'test-utils';

// Test Subject
import DonationPageDisclaimer from './Disclaimer';

const defaultProps = {
  currencySymbol: '$',
  amount: 120,
  frequency: 'month'
};

it('should render some initial static text', () => {
  render(<DonationPageDisclaimer {...defaultProps} />);

  expect(
    screen.getByText('By proceeding with this transaction, you agree to our', { exact: false })
  ).toBeInTheDocument();
});

it('should render links pointing to fundjournalism.org\'s "privacy policy" and "terms & conditions"', () => {
  render(<DonationPageDisclaimer {...defaultProps} />);

  const links = screen.getAllByRole('link');

  expect(links).toHaveLength(2);
  expect(links[0]).toHaveTextContent('privacy policy');
  expect(links[0]).toHaveAttribute('href', 'https://fundjournalism.org/faq/privacy-policy/');

  expect(links[1]).toHaveTextContent('terms & conditions');
  expect(links[1]).toHaveAttribute('href', 'https://fundjournalism.org/faq/terms-of-service/');
});

it('should include the amount provided as a prop in the rendered text', () => {
  render(<DonationPageDisclaimer {...defaultProps} />);

  expect(
    screen.getByText(`${defaultProps.currencySymbol}${defaultProps.amount}`, { exact: false })
  ).toBeInTheDocument();
});

it('should show slightly different text based on the frequency prop', () => {
  const { rerender } = render(<DonationPageDisclaimer {...defaultProps} />);

  expect(screen.getByText('along with all future recurring payments', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('of the month until you cancel', { exact: false })).toBeInTheDocument();

  rerender(<DonationPageDisclaimer {...{ ...defaultProps, frequency: 'year' }} />);
  expect(screen.getByText('along with all future recurring payments', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('yearly until you cancel', { exact: false })).toBeInTheDocument();

  rerender(<DonationPageDisclaimer {...{ ...defaultProps, frequency: 'one_time' }} />);

  expect(screen.queryByText('along with all future recurring payments', { exact: false })).toBeNull();
});
