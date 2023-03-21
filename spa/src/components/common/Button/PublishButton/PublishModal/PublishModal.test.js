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
  const tree = () => render(<PublishModal open onClose={onClose} onPublish={onPublish} page={page} />);

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

  it('should render pre-existing page slug', () => {
    const slug = 'previous-published';
    render(<PublishModal open={true} onClose={onClose} onPublish={onPublish} page={{ ...page, slug }} />);

    const publishButton = screen.getByRole('button', { name: 'Publish' });
    expect(publishButton).toBeEnabled();

    const slugInput = screen.getByRole('textbox', { name: /page name/i });
    expect(slugInput).toHaveValue(slug);
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
