import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import SuccessBanner, { SuccessBannerProps } from './SuccessBanner';

function tree(show: SuccessBannerProps['show']) {
  return render(<SuccessBanner message="mock-message" show={show} />);
}

describe('SuccessBanner', () => {
  it('should render message text when show is true', async () => {
    tree(true);
    expect(screen.getByText('mock-message')).toBeVisible();
  });

  it('should not render when show is false', async () => {
    tree(false);
    expect(screen.queryByText('mock-message')).not.toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree(true);
    expect(await axe(container)).toHaveNoViolations();
  });
});
