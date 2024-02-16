import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import MobileBackButton from './MobileBackButton';

function tree() {
  return render(<MobileBackButton />);
}

describe('MobileBackButton', () => {
  // Hidden used below because the component defaults to a display: none state,
  // and we can't simulate a mobile viewport.

  it('shows a link back to the contribution list', () => {
    tree();

    const back = screen.getByRole('link', { hidden: true, name: 'Back' });

    expect(back).toHaveAttribute('href', '/portal/my-contributions/');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
