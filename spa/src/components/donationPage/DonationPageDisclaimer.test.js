import { render, screen } from 'test-utils';

// Test Subject
import DonationPageDisclaimer from './DonationPageDisclaimer';
// needs to be relative import otherwise import doesn't work for some reason in jest test context
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';

// Mock data
import mockPage from '../../../cypress/fixtures/pages/live-page-1.json';

it('should render some initial static text', () => {
  render(<DonationPageDisclaimer page={mockPage} amount={120} payFee={false} frequency={'month'} />);

  expect(
    screen.getByText('By proceeding with this transaction, you agree to our', { exact: false })
  ).toBeInTheDocument();
});

it('should render links pointing to fundjournalism.org\'s "privacy policy" and "terms & conditions"', () => {
  render(<DonationPageDisclaimer page={mockPage} amount={120} payFee={false} frequency={'month'} />);

  const links = screen.getAllByRole('link');

  expect(links).toHaveLength(2);
  expect(links[0]).toHaveTextContent('privacy policy');
  expect(links[0]).toHaveAttribute('href', 'https://fundjournalism.org/faq/privacy-policy/');

  expect(links[1]).toHaveTextContent('terms & conditions');
  expect(links[1]).toHaveAttribute('href', 'https://fundjournalism.org/faq/terms-of-service/');
});

it('should include the amount provided as a prop in the rendered text', () => {
  const expCurrencySymbol = mockPage.currency.symbol;
  const expAmount = 120;
  render(<DonationPageDisclaimer page={mockPage} amount={expAmount} payFee={false} frequency={'month'} />);

  expect(screen.getByText(`${expCurrencySymbol}${expAmount}`, { exact: false })).toBeInTheDocument();
});

it('should show slightly different text based on the frequency prop', () => {
  const { rerender } = render(
    <DonationPageDisclaimer page={mockPage} amount={120} payFee={false} frequency={CONTRIBUTION_INTERVALS.MONTHLY} />
  );

  expect(screen.getByText('along with all future recurring payments', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('of the month until you cancel', { exact: false })).toBeInTheDocument();

  rerender(
    <DonationPageDisclaimer page={mockPage} amount={120} payFee={false} frequency={CONTRIBUTION_INTERVALS.ANNUAL} />
  );

  expect(screen.getByText('along with all future recurring payments', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('yearly until you cancel', { exact: false })).toBeInTheDocument();

  rerender(
    <DonationPageDisclaimer page={mockPage} amount={120} payFee={false} frequency={CONTRIBUTION_INTERVALS.ONE_TIME} />
  );

  expect(screen.queryByText('along with all future recurring payments', { exact: false })).toBeNull();
});
