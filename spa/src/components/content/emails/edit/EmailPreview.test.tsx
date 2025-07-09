import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import EmailPreview, { EmailPreviewProps } from './EmailPreview';

const testRp = {
  name: 'test-rp-name',
  transactional_email_style: {
    is_default_logo: false,
    logo_alt_text: 'test-rp-logo-alt-text',
    logo_url: 'test-rp-logo-url'
  }
} as any;

function tree(props?: Partial<EmailPreviewProps>) {
  return render(<EmailPreview revenueProgram={testRp} {...props} />);
}

describe('EmailPreview', () => {
  it('shows children', () => {
    tree({ children: 'children' });
    expect(screen.getByText('children')).toBeVisible();
  });

  // Content tests here aren't exhaustive--capturing logic around revenue program data.

  it("shows the revenue program's logo", () => {
    tree();
    expect(screen.getByRole('img', { name: testRp.transactional_email_style.logo_alt_text })).toBeVisible();
  });

  it('shows a copyright with the revenue program name', () => {
    tree();
    expect(screen.getByText(`© ${new Date().getFullYear()} ${testRp.name}`)).toBeVisible();
  });

  it.each([
    [
      'for-profit',
      { fiscal_status: 'for-profit' },
      `Contributions to ${testRp.name} are not deductible as charitable donations.`
    ],
    [
      'non-profit without tax ID',
      { fiscal_status: 'nonprofit' },
      `No goods or services were provided in exchange for this contribution. This receipt may be used for tax purposes. ${testRp.name} is a 501(c)(3) nonprofit organization.`
    ],
    [
      'non-profit with tax ID',
      { fiscal_status: 'nonprofit', tax_id: 'test-tax-id' },
      `No goods or services were provided in exchange for this contribution. This receipt may be used for tax purposes. ${testRp.name} is a 501(c)(3) nonprofit organization with a Federal Tax ID #test-tax-id.`
    ],
    [
      'fiscally-sponsored',
      { fiscal_status: 'fiscally sponsored', fiscal_sponsor_name: 'test-sponsor-name', tax_id: 'test-tax-id' },
      `All contributions or gifts to ${testRp.name} are tax deductible through our fiscal sponsor test-sponsor-name. test-sponsor-name's tax ID is test-tax-id.`
    ]
  ])('shows the correct disclaimer for a %s revenue program', (_, rpProps, expectedText) => {
    tree({ revenueProgram: { ...testRp, ...rpProps } });
    expect(screen.getByTestId('rp-status')).toHaveTextContent(expectedText);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
