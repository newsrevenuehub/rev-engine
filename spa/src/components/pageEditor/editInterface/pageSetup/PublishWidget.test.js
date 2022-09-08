import { render, screen } from 'test-utils';

import PublishWidget from './PublishWidget';

const validPaymentProvider = {
  stripe_verified: true
};

const unverifiedPaymentProvider = {
  stripe_verified: false
};

it('should show publish widget if payment provider is present and is stripe_verified', () => {
  render(<PublishWidget paymentProvider={validPaymentProvider} />);
  const eMessage = screen.queryByText(/Page cannot be published/i);
  expect(eMessage).not.toBeInTheDocument();
});

it('should not show publish widget if payment provider is present and is not stripe_verified', () => {
  render(<PublishWidget paymentProvider={unverifiedPaymentProvider} />);
  const eMessage = screen.queryByText(/Page cannot be published/i);
  expect(eMessage).toBeInTheDocument();
});

it('should not show publish widget if payment provider is null', () => {
  render(<PublishWidget paymentProvider={null} />);
  const eMessage = screen.queryByText(/Page cannot be published/i);
  expect(eMessage).toBeInTheDocument();
});
