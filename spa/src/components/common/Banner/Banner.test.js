import { render, screen, fireEvent } from 'test-utils';
import { axe } from 'jest-axe';

import { BANNER_TYPE } from 'constants/bannerConstants';

import Banner from './Banner';

describe('Banner', () => {
  const tree = (props) => render(<Banner type={BANNER_TYPE.STRIPE} {...props} />);

  it('should render banner information', () => {
    tree();

    expect(screen.getByText(/set up a Stripe connection/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /dismiss message/i })).toBeEnabled();
  });

  it('should render publish type information', () => {
    tree({ type: BANNER_TYPE.PUBLISH });

    expect(screen.getByText(/publish a contribution page/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /dismiss message/i })).toBeEnabled();
  });

  it('should close banner if button is clicked', () => {
    tree();
    expect(screen.getByTestId('banner')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /dismiss message/i }));
    expect(screen.queryByTestId('banner')).toBeNull();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
