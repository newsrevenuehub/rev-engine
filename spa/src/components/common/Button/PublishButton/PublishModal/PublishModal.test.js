import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';
import getDomain from 'utilities/getDomain';
import PublishModal from './PublishModal';

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
const onPublish = jest.fn();
const domain = getDomain(window.location.host);

describe('PublishModal', () => {
  const tree = (props) => render(<PublishModal open onClose={onClose} onPublish={onPublish} page={page} {...props} />);

  it('should render modal', () => {
    tree();

    const modal = screen.getByRole('presentation', { name: `Publish page ${page.name}` });
    expect(modal).toBeVisible();

    const title = screen.getByText(/Publish Page/i);
    expect(title).toBeVisible();

    const info = screen.getByText(/fill out the fields to create your contribution page link/i);
    expect(info).toBeVisible();

    const warning = screen.getByText('*Site name can’t be changed upon publish.');
    expect(warning).toBeVisible();

    const domainUrl = screen.getByRole('textbox', { name: 'Domain URL' });
    expect(domainUrl).toBeVisible();
    expect(domainUrl).toHaveValue(`.${domain}/`);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeEnabled();

    const publishButton = screen.getByRole('button', { name: 'Publish' });
    expect(publishButton).toBeEnabled();
  });

  it("sets the slug field to the page's slug", () => {
    const slug = 'previous-published';

    tree({ page: { ...page, slug } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: /page name/i })).toHaveValue(slug);
  });

  it('sets the slug field to an empty string if the page slug matches the default pattern', () => {
    tree({ page: { ...page, slug: `${page.revenue_program.name}-page-1` } });
    expect(screen.getByRole('textbox', { name: /page name/i })).toHaveValue('');
  });

  it('disables the publish button if the slug field is empty', () => {
    tree({ page: { ...page, slug: `${page.revenue_program.name}-page-123` } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('should call onClose', () => {
    tree();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeEnabled();

    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls the onPublish prop when the Publish button is clicked', () => {
    tree();

    const publishButton = screen.getByRole('button', { name: 'Publish' });
    const slugInput = screen.getByRole('textbox', { name: /page name/i });
    expect(slugInput).toHaveValue(page.slug);

    fireEvent.change(slugInput, { target: { value: 'donate-now' } });
    expect(slugInput).toHaveValue('donate-now');
    expect(publishButton).toBeEnabled();

    fireEvent.click(publishButton);
    expect(onPublish).toHaveBeenCalled();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
