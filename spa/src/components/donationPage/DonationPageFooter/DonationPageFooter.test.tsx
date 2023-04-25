import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DonationPageFooter, { DonationPageFooterProps } from './DonationPageFooter';
import { HOME_PAGE_URL } from 'constants/helperUrls';

function tree(props?: Partial<DonationPageFooterProps>) {
  return render(<DonationPageFooter {...props} />);
}

describe('DonationPageFooter', () => {
  it('displays a link to fundjournalism.org', () => {
    tree();

    const link = screen.getByRole('link', { name: 'What is fundjournalism.org?' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', HOME_PAGE_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('displays a copyright notice', () => {
    tree();
    expect(screen.getByText(`© ${new Date().getFullYear()}`)).toBeVisible();
  });

  it("displays the page's revenue program name in the copyright notice if defined", () => {
    tree({ page: { revenue_program: { name: 'test-rp-name' } } as any });
    expect(screen.getByText(`© ${new Date().getFullYear()} test-rp-name`)).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
