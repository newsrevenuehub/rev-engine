import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';
import getDomain from 'utilities/getDomain';
import PublishModal, { PublishModalProps } from './PublishModal';

const mockPage = {
  id: 'mock-id',
  name: 'Contribution Page',
  revenue_program: {
    slug: 'news-revenue-hub',
    name: 'News Revenue Hub'
  },
  slug: 'random-page-slug',
  published_date: '',
  payment_provider: {}
};

const domain = getDomain(window.location.host);

const onClose = jest.fn();
const onPublish = jest.fn();

function tree(props?: Partial<PublishModalProps>) {
  return render(
    <PublishModal open loading={false} onClose={onClose} onPublish={onPublish} page={mockPage as any} {...props} />
  );
}

describe('PublishModal', () => {
  it('should render modal', () => {
    tree();

    const modal = screen.getByRole('presentation', { name: `Publish page ${mockPage.name}` });
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

    tree({ page: { ...mockPage, slug } as any });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: /page name/i })).toHaveValue(slug);
  });

  it('disables the publish button if the slug field is empty', () => {
    tree({ page: { ...mockPage, slug: '' } as any });
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
    expect(slugInput).toHaveValue(mockPage.slug);

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

  it('should display an error message if there is an error with page slug', () => {
    const msg1 = 'This field is toooooo loooooong';
    const msg2 = 'Page slug is already taken';
    tree({ slugError: [msg1, msg2] });

    const concatenatedMsg = `${msg1}. ${msg2}`;
    const errorMsg = screen.getByText(concatenatedMsg);
    expect(errorMsg).toBeVisible();
  });
});
