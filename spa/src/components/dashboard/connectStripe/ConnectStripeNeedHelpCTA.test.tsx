import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import ConnectStripeNeedHelpCTA from './ConnectStripeNeedHelpCTA';

describe('ConnectStripeNeedHelpTA', () => {
  it('is accessible', async () => {
    const { container } = render(<ConnectStripeNeedHelpCTA />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has the right link', () => {
    render(<ConnectStripeNeedHelpCTA />);
    expect(screen.getByRole('link', { name: 'FAQ' })).toBeInTheDocument();
  });
});
