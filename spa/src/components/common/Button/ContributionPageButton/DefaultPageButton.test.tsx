import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import DefaultPageButton from './DefaultPageButton';

function tree() {
  return render(<DefaultPageButton domId="mock-id" />);
}

describe('DefaultPageButton', () => {
  describe('When the popover is closed', () => {
    it('displays a button', () => {
      tree();
      expect(screen.getByRole('button', { name: 'Default contribution page' })).toBeVisible();
    });

    it("doesn't set aria-pressed on the button", () => {
      tree();
      expect(screen.getByRole('button', { name: 'Default contribution page' })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });

    it("doesn't display the popover", () => {
      tree();
      expect(screen.queryByText('What is a default contribution page?')).not.toBeInTheDocument();
    });

    it('displays the popover when the button is clicked', () => {
      tree();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('What is a default contribution page?')).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When the popover is open', () => {
    it('sets aria-pressed on the button', () => {
      tree();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Default contribution page' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('displays explanatory text', () => {
      tree();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('What is a default contribution page?')).toBeVisible();
      expect(
        screen.getByText(
          'The default contribution page is used in several ways to streamline your branding and redirects. Your transactional emails, contributor portal, and default thank you page will all pull styles and settings from the default checkout page.'
        )
      ).toBeVisible();
      expect(
        screen.getByText(
          'Any expired contribution page links will redirect to your default page. This allows contributors to always find their way to your page to contribute even if a campaign has ended and the link they are following is no longer active.'
        )
      ).toBeVisible();
    });

    it('displays a help link', () => {
      tree();
      fireEvent.click(screen.getByRole('button'));

      const link = screen.getByRole('link', { name: 'Support Team' });

      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', 'https://fundjournalism.org/news-revenue-engine-help/');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('closes the popover when the close button is clicked', async () => {
      tree();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('What is a default contribution page?')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(screen.queryByText('What is a default contribution page?')).not.toBeInTheDocument());
    });
  });
});
