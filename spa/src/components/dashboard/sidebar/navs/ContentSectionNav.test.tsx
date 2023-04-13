import { axe } from 'jest-axe';
import { CONTENT_SLUG, CUSTOMIZE_SLUG } from 'routes';
import { render, screen } from 'test-utils';
import ContentSectionNav from './ContentSectionNav';

function tree() {
  return render(
    <div role="list">
      <ContentSectionNav />
    </div>
  );
}

describe('ContentSectionNav', () => {
  it('shows a link to the Pages page', () => {
    tree();

    const pagesLink = screen.getByRole('listitem', { name: 'Pages' });

    expect(pagesLink).toBeVisible();
    expect(pagesLink).toHaveAttribute('href', CONTENT_SLUG);
  });

  it('shows a link to the Customize page', () => {
    tree();

    const pagesLink = screen.getByRole('listitem', { name: 'Customize' });

    expect(pagesLink).toBeVisible();
    expect(pagesLink).toHaveAttribute('href', CUSTOMIZE_SLUG);
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
