import { render, screen } from 'test-utils';

import ConnectStripeToast from './ConnectStripeToast';
describe('ConnectStripeToast', () => {
  test('should have the relevant com', () => {
    render(<ConnectStripeToast />);
    const connectToStripeButton = screen.getByRole('button', { name: 'Connect Now' });
    expect(connectToStripeButton).toBeEnabled();
  });
});
