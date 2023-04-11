import { axe } from 'jest-axe';
import { DONATIONS_SLUG } from 'routes';
import { render, screen } from 'test-utils';
import ContributionSectionNav from './ContributionSectionNav';

function tree() {
  return render(
    <div role="list">
      <ContributionSectionNav />
    </div>
  );
}

describe('ContributionSectionNav', () => {
  it('shows a link to the Customize page', () => {
    tree();

    const contributionsLink = screen.getByRole('listitem', { name: 'Contributions' });

    expect(contributionsLink).toBeVisible();
    expect(contributionsLink).toHaveAttribute('href', DONATIONS_SLUG);
  });

  it('is accessible', async () => {
    // It looks like axe does not like us putting `role="listitem"` directly on
    // an <a> element (aria-allowed-role). The other rule violations disabled
    // here cascade from there.
    //
    // See
    // https://dequeuniversity.com/rules/axe/4.4/aria-allowed-role?application=axeAPI

    const { container } = tree();

    expect(
      await axe(container, {
        rules: {
          'aria-allowed-role': { enabled: false },
          'aria-required-children': { enabled: false },
          'aria-required-parent': { enabled: false }
        }
      })
    ).toHaveNoViolations();
  });
});
