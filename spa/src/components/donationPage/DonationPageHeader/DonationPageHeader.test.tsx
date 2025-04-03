import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DonationPageHeader, { DonationPageHeaderProps } from './DonationPageHeader';

jest.mock('hooks/useImageSource');

const mockPage = {
  header_bg_image: 'mock-header-bg-img',
  header_link: 'mock-header-link',
  header_logo: 'mock-header-logo',
  header_logo_alt_text: 'mock-header-logo-alt-text'
} as any;

function tree(props?: Partial<DonationPageHeaderProps>) {
  return render(<DonationPageHeader page={mockPage} {...props} />);
}

describe('DonationPageHeader', () => {
  describe('When no link or logo are set', () => {
    it('is accessible', async () => {
      const { container } = tree({
        page: { ...mockPage, header_link: undefined, header_logo: undefined, header_logo_alt_text: undefined }
      });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When a logo is set', () => {
    const page = { ...mockPage, header_link: undefined };

    it('displays the logo', () => {
      tree({ page });

      const logo = screen.getByRole('img');

      expect(logo).toBeVisible();
      expect(logo).toHaveAttribute('src', 'mock-use-image-source-mock-header-logo');
    });

    it('sets alt text on the logo', () => {
      tree({ page });
      expect(screen.getByRole('img', { name: 'mock-header-logo-alt-text' })).toBeVisible();
    });

    it('leaves alt text blank', () => {
      tree({ page: { ...page, header_logo_alt_text: '' } });

      const logo = screen.getByRole('img');

      expect(logo).toHaveAttribute('alt', '');
    });

    it("doesn't link the logo to anything", () => {
      tree({ page });
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({ page });

      expect(await axe(container)).toHaveNoViolations();
    });

    describe('When a link is also set', () => {
      it('links the logo to the URL specified', () => {
        tree();

        const link = screen.getByRole('link', { name: 'mock-header-logo-alt-text' });

        expect(link).toBeVisible();
        expect(link).toHaveAttribute('href', 'mock-header-link');
      });

      it('is accessible', async () => {
        const { container } = tree();

        expect(await axe(container)).toHaveNoViolations();
      });

      describe('but the image has blank alt text', () => {
        it('forces alt text of "Logo"', () => {
          tree({ page: { ...mockPage, header_logo_alt_text: '' } });

          const link = screen.getByRole('link', { name: 'common.logo' });

          expect(link).toBeVisible();
          expect(link).toHaveAttribute('href', 'mock-header-link');
        });

        it('is accessible', async () => {
          const { container } = tree({ page: { ...mockPage, header_logo_alt_text: '' } });

          expect(await axe(container)).toHaveNoViolations();
        });
      });
    });
  });

  describe('When a link is set but not a logo', () => {
    const page = { ...mockPage, header_logo: undefined };

    it("doesn't display a link", () => {
      tree({ page });
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({ page });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
