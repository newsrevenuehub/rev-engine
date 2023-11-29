import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';

import { DONATIONS_SLUG } from 'routes';
import { pageLink, portalLink } from 'utilities/getPageLinks';

import SuccessfulPublishModal from './SuccessfulPublishModal';

const page = {
  name: 'Contribution Page',
  revenue_program: {
    slug: 'news-revenue-hub'
  },
  slug: 'random-page-slug',
  published_date: '',
  payment_provider: {}
};

const onClose = jest.fn();

describe('SuccessfulPublishModal', () => {
  const renderComponent = () => render(<SuccessfulPublishModal open={true} onClose={onClose} page={page} />);

  it('should render modal', () => {
    renderComponent();
    const modal = screen.getByRole('presentation', { name: `Successfully published page ${page.name}` });
    expect(modal).toBeVisible();
  });

  it('should render modal texts', () => {
    renderComponent();
    expect(screen.getByText(/Successfully Published Page/i)).toBeVisible();
    expect(screen.getByText(/Your page was successfully published. Copy the link below to update your/i)).toBeVisible();
    expect(screen.getByText(/The Contributor Portal link is where your contributors can view, edit./i)).toBeVisible();
  });

  it('should render modal actions', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /Close modal/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /go to page/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /view contributions/i })).toBeEnabled();
  });

  it('should render page link', () => {
    renderComponent();
    expect(screen.getByRole('textbox', { name: 'Contribution Page Link' })).toHaveValue(pageLink(page));
  });

  it('should render portal link', () => {
    renderComponent();
    expect(screen.getByRole('textbox', { name: 'Contributor Portal Link' })).toHaveValue(portalLink(page));
  });

  it('should call onClose', () => {
    renderComponent();
    const closeButton = screen.getByRole('button', { name: /Close modal/i });
    expect(closeButton).toBeEnabled();
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should have link with correct go to page url and open in new tab', () => {
    renderComponent();

    const goToLink = screen.getByRole('link', { name: /go to page/i });
    expect(goToLink).toBeEnabled();
    expect(goToLink).toHaveAttribute('href', `//${pageLink(page)}`);
    expect(goToLink).toHaveAttribute('target', '_blank');
    expect(goToLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should close modal when "Go To Page" is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('link', { name: /go to page/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('should link to view contribution page', () => {
    renderComponent();
    const contribLink = screen.getByRole('link', { name: /view contributions/i });
    expect(contribLink).toBeEnabled();
    expect(contribLink).toHaveAttribute('href', DONATIONS_SLUG);
  });

  it('should be accessible', async () => {
    const { container } = renderComponent();
    expect(await axe(container)).toHaveNoViolations();
  });
});
