import { render } from 'test-utils';

// Test Subject
import DonationPageStaticText from './DonationPageStaticText';

// Mock data
import mockPage from '../../../cypress/fixtures/pages/live-page-1';

it('should render some initial static text', () => {
  const { getByText } = render(
    <DonationPageStaticText page={mockPage} amount={120} payFee={false} frequency={'month'} />
  );

  expect(getByText('By proceeding with this transaction, you agree to our', { exact: false })).toBeInTheDocument();
});

it('should render links pointing to fundjournalism.org\'s "privacy policy" and "terms & conditions"', () => {
  const { getAllByRole } = render(
    <DonationPageStaticText page={mockPage} amount={120} payFee={false} frequency={'month'} />
  );

  const links = getAllByRole('link');

  expect(links).toHaveLength(2);
  expect(links[0]).toHaveTextContent('privacy policy');
  expect(links[0]).toHaveAttribute('href', 'https://fundjournalism.org/faq/privacy-policy/');

  expect(links[1]).toHaveTextContent('terms & conditions');
  expect(links[1]).toHaveAttribute('href', 'https://fundjournalism.org/faq/terms-of-service/');
});

it('should include the amount provided as a prop in the rendered text', () => {
  const expCurrencySymbol = mockPage.currency.symbol;
  const expAmount = 120;
  const { getByText } = render(
    <DonationPageStaticText page={mockPage} amount={expAmount} payFee={false} frequency={'month'} />
  );

  expect(getByText(`${expCurrencySymbol}${expAmount}`, { exact: false })).toBeInTheDocument();
});

it('should show slightly different text based on the frequency prop', () => {
  const monthly = 'month';
  const { rerender, getByText, queryByText } = render(
    <DonationPageStaticText page={mockPage} amount={120} payFee={false} frequency={monthly} />
  );

  expect(getByText('along with all future recurring payments', { exact: false })).toBeInTheDocument();
  expect(getByText('of the month until you cancel', { exact: false })).toBeInTheDocument();

  const yearly = 'year';
  rerender(<DonationPageStaticText page={mockPage} amount={120} payFee={false} frequency={yearly} />);

  expect(getByText('along with all future recurring payments', { exact: false })).toBeInTheDocument();
  expect(getByText('yearly until you cancel', { exact: false })).toBeInTheDocument();

  const once = 'one_time';
  rerender(<DonationPageStaticText page={mockPage} amount={120} payFee={false} frequency={once} />);

  expect(queryByText('along with all future recurring payments', { exact: false })).toBeNull();
});
