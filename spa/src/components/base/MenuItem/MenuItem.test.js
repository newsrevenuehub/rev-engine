import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import MenuItem from './MenuItem';

function tree() {
  return render(
    <div role="menu">
      <MenuItem id="mock-label" value="mock-value" aria-label="mock-option" />
    </div>
  );
}

describe('MenuItem', () => {
  it('displays a text input', () => {
    tree();
    expect(screen.getByRole('menuitem', { value: 'mock-value' })).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
