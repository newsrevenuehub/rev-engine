import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PostContributionSharing, { PostContributionSharingProps } from './PostContributionSharing';

function tree(props?: Partial<PostContributionSharingProps>) {
  return render(
    <PostContributionSharing
      donationPageUrl="mock-donation-page-url"
      revenueProgram={
        {
          name: 'mock-rp-name',
          twitter_handle: 'mock-rp-twitter-handle',
          website_url: 'mock-rp-website-url'
        } as any
      }
      {...props}
    />
  );
}

describe('PostContributionSharing', () => {
  it('shows a link to share the donation page on Facebook', () => {
    tree();

    const link = screen.getByRole('link', { name: 'Share' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'https://www.facebook.com/sharer/sharer.php?u=mock-donation-page-url');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a link to share the donation page on Twitter', () => {
    tree();

    const link = screen.getByRole('link', { name: 'Tweet' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute(
      'href',
      'https://twitter.com/intent/tweet?text=I support @mock-rp-twitter-handle. You should too. mock-donation-page-url @fundjournalism'
    );
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a link to share the donation page via email', () => {
    tree();

    const link = screen.getByRole('link', { name: 'Email' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute(
      'href',
      "mailto:?subject=You should really check out mock-rp-name&body=I just gave to mock-rp-name, and I think you should too: mock-rp-website-url%0D%0A %0D%0AIf you're not familiar with mock-rp-name's work, you can sign up for their newsletter here: mock-rp-website-url%0D%0A %0D%0ASincerely,%0D%0A %0D%0A %0D%0A %0D%0AContribute today: mock-donation-page-url"
    );
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
