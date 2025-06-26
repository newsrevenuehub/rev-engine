import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import IntegrationLogos, { logos } from './IntegrationLogos';

function tree() {
  return render(<IntegrationLogos />);
}

describe('IntegrationLogos', () => {
  it('shows all logos', () => {
    tree();

    for (const { name } of logos) {
      expect(screen.getByRole('img', { name })).toBeVisible();
    }
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
