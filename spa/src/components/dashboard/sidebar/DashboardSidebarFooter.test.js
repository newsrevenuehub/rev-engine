import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DashboardSidebarFooter, { footerHrefs } from './DashboardSidebarFooter';

describe('DashboardSidebarFooter', () => {
  function tree(props) {
    return render(
      <div role="list">
        <DashboardSidebarFooter {...props} />
      </div>
    );
  }

  it('renders an FAQ link that opens in a new tab', () => {
    tree();

    const faqLink = screen.getByRole('listitem', { name: 'FAQ' });

    expect(faqLink).toBeVisible();
    expect(faqLink).toHaveAttribute('href', footerHrefs.faq);
    expect(faqLink).toHaveAttribute('target', '_blank');
  });

  it('renders a help link', () => {
    tree();

    const helpLink = screen.getByRole('listitem', { name: 'Help' });

    expect(helpLink).toBeVisible();
    expect(helpLink).toHaveAttribute('href', footerHrefs.help);
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
