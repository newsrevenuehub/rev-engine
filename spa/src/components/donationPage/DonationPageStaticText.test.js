import { render } from 'test-utils';

// Test Subject
import DonationPageStaticText from './DonationPageStaticText';

// Mock data
import mockPage from '../../../cypress/fixtures/pages/live-page-1.json';

it('should just do something to test testing', () => {
  const amount = 120;
  const freq = 'month';
  const { getByText } = render(
    <DonationPageStaticText page={mockPage} amount={amount} payFee={false} frequency={freq} />
  );

  expect(getByText('Have questions or want to change a recurring', { exact: false })).toBeInTheDocument();
});
