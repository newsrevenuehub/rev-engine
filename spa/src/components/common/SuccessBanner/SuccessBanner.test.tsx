import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import SuccessBanner from './SuccessBanner';

function tree() {
  return render(<SuccessBanner message="mock-message" />);
}

describe('SuccessBanner', () => {
  it('should render message text', async () => {
    tree();
    expect(screen.getByText('mock-message')).toBeVisible();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
