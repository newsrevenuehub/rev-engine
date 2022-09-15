import { render, screen } from 'test-utils';

import PublishWidget from './PublishWidget';

it('should show publish widget if payment provider is present and is stripe_verified', () => {
  render(<PublishWidget isStripeVerified={true} />);
  const eMessage = screen.queryByText(/Page cannot be published/i);
  expect(eMessage).not.toBeInTheDocument();
});

it('should not show publish widget if payment provider is present and is not stripe_verified', () => {
  render(<PublishWidget isStripeVerified={false} />);
  const eMessage = screen.queryByText(/Page cannot be published/i);
  expect(eMessage).toBeInTheDocument();
});
