import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PublishedPopover, { PublishedPopoverProps } from './PublishedPopover';

function tree(props?: Partial<PublishedPopoverProps>) {
  return render(
    <PublishedPopover
      anchorEl={document.body}
      onClose={jest.fn()}
      open
      page={
        {
          published_date: new Date('January 1, 2000 1:23 PM'),
          revenue_program: {
            slug: 'rp-slug'
          },
          slug: 'test-page-slug'
        } as any
      }
      {...props}
    />
  );
}

describe('PublishedPopover', () => {
  it('displays nothing when not open', () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  describe('When open', () => {
    it('displays a link to go to the published page URL', () => {
      tree();
      expect(screen.getByRole('link', { name: 'Page link' })).toHaveAttribute(
        'href',
        '//rp-slug.localhost/test-page-slug'
      );
    });

    it("displays the page's publish date", () => {
      tree();
      expect(screen.getByText('01/1/2000 at 01:23 PM')).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
