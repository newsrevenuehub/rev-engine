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
} as any;

function tree(props?: Partial<PublishModalProps>) {
  return render(
    <PublishModal open loading={false} onClose={jest.fn()} onPublish={jest.fn()} page={mockPage} {...props} />
  );
}

describe('PublishModal', () => {
  it('shows a modal with cancel and publish buttons', () => {
    tree();
    expect(screen.getByRole('dialog', { name: 'Publish Page' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it("shows the domain that the page's revenue program belongs to", () => {
    tree();
    expect(screen.getByText(mockPage.revenue_program.slug, { exact: false })).toBeVisible();

    for (const text of screen.getAllByText(getDomain(), { exact: false })) {
      expect(text).toBeVisible();
    }
  });

  it("sets the slug field to the page's slug", () => {
    const slug = 'previous-published';

    tree({ page: { ...mockPage, slug } as any });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Page Name' })).toHaveValue(slug);
  });

  it('disables the publish button if the slug field is empty', () => {
    tree({ page: { ...mockPage, slug: '' } as any });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('disables the publish button and shows a different label if the loading prop is true', () => {
    tree({ loading: true });
    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled();
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = jest.fn();

    tree({ onClose });
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls the onPublish prop when the publish button is clicked', () => {
    const onPublish = jest.fn();

    tree({ onPublish });

    const publishButton = screen.getByRole('button', { name: 'Publish' });
    const slugInput = screen.getByRole('textbox', { name: 'Page Name' });

    expect(slugInput).toHaveValue(mockPage.slug);
    fireEvent.change(slugInput, { target: { value: 'donate-now' } });
    expect(slugInput).toHaveValue('donate-now');
    expect(publishButton).toBeEnabled();

    fireEvent.click(publishButton);
    expect(onPublish.mock.calls).toEqual([[{ slug: 'donate-now' }]]);
  });

  it('displays an error message if there is an error with the page slug', () => {
    const msg1 = 'This field is toooooo loooooong';
    const msg2 = 'Page slug is already taken';
    tree({ slugError: [msg1, msg2] });

    const concatenatedMsg = `${msg1}. ${msg2}`;
    const errorMsg = screen.getByText(concatenatedMsg);
    expect(errorMsg).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
