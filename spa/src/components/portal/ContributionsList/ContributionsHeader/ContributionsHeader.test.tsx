import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionsHeader, { ContributionsHeaderProps } from './ContributionsHeader';

const mockPage = {
  revenue_program: {
    slug: 'mock-rp-slug'
  },
  slug: 'mock-page-slug'
} as any;

const mockRp = {
  website_url: 'mock-rp-url'
} as any;

function tree(props?: Partial<ContributionsHeaderProps>) {
  return render(<ContributionsHeader defaultPage={mockPage} revenueProgram={mockRp} {...props} />);
}

describe('ContributionsHeader', () => {
  it('shows a header and messsage', () => {
    tree();
    expect(screen.getByRole('heading', { name: 'Your Contributions' })).toBeVisible();
    expect(
      screen.getByText(
        'Your support helps quality journalism thrive, so that we can create a more informed and engaged society. Thank you for being a contributor.'
      )
    ).toBeVisible();
  });

  it("shows a Return to Website link that goes to an RP's website in a new tab if given a revenue program", () => {
    tree();

    const link = screen.getByRole('link', { name: 'Return to Website' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'mock-rp-url');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it("doesn't show a Return to Website link if not given a revenue program", () => {
    tree({ revenueProgram: undefined });
    expect(screen.queryByRole('link', { name: 'Return to Website' })).not.toBeInTheDocument();
  });

  it('shows a Make A New Contribution link that goes to a default contribution page if given', () => {
    tree();

    const link = screen.getByRole('link', { name: 'Make a New Contribution' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'mock-rp-slug.localhost/mock-page-slug');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it("doesn't show a Make A New Contribution link if not given a default page", () => {
    tree({ defaultPage: undefined });
    expect(screen.queryByRole('link', { name: 'Make a New Contribution' })).not.toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
