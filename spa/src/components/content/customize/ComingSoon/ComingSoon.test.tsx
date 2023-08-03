import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ComingSoon from './ComingSoon';

function tree() {
  return render(<ComingSoon />);
}

describe('ComingSoon', () => {
  it('displays texts', () => {
    tree();
    expect(screen.getByText('More features coming soon!')).toBeVisible();
    expect(
      screen.getByText(
        'We’re working hard to develop new features to help you customize your contribution experience. Keep checking back for updates.'
      )
    ).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
