import { render, screen, fireEvent } from 'test-utils';
import { axe } from 'jest-axe';

import { BANNER_TYPE } from 'constants/bannerConstants';

import Banner from './Banner';

const messageStripe = 'Looks like you need to set up a Stripe connection in order to start receiving contributions.';
const messagePublish = 'Looks like you need to publish a contribution page in order to start receiving contributions.';

describe('Banner', () => {
  const tree = (props) => render(<Banner type={BANNER_TYPE.BLUE} message={messageStripe} {...props} />);

  it('should render banner information', () => {
    tree();

    expect(screen.getByText(/set up a Stripe connection/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /Got it/i })).toBeEnabled();
  });

  it('should render publish type information', () => {
    tree({ type: BANNER_TYPE.YELLOW, message: messagePublish });

    expect(screen.getByText(/publish a contribution page/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /Got it/i })).toBeEnabled();
  });

  it('should close banner if button is clicked', () => {
    tree();
    expect(screen.getByTestId('banner')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Got it/i }));
    expect(screen.queryByTestId('banner')).toBeNull();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
