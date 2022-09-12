import { render, screen, fireEvent } from 'test-utils';
import getDomain from 'utilities/getDomain';

import PublishModal from './PublishModal';

const page = {
  name: 'Donation Page',
  revenue_program: {
    slug: 'news-revenue-hub'
  },
  slug: 'donate',
  published_date: '2021-11-18T21:51:53Z',
  payment_provider: {}
};

const onClose = jest.fn();
const onPublish = jest.fn();
const domain = getDomain(window.location.host);

describe('PublishModal', () => {
  const renderComponent = () => {
    render(<PublishModal open={true} onClose={onClose} onPublish={onPublish} page={page} />);
  };

  it('should render modal', () => {
    renderComponent();

    const modal = screen.getByRole('presentation');
    expect(modal).toBeVisible();

    const title = screen.getByText(/Publish Page/i);
    expect(title).toBeVisible();

    const info = screen.getByText(/fill out the fields to create your contribution page link/i);
    expect(info).toBeVisible();

    const warning = screen.getByText('*Site name can’t be changed upon publish.');
    expect(warning).toBeVisible();

    const domainUrl = screen.getByRole('textbox', { name: `Domain url: .${domain}/` });
    expect(domainUrl).toBeVisible();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeEnabled();

    const publishButton = screen.getByRole('button', { name: 'Publish' });
    expect(publishButton).toBeDisabled();
  });

  it('should call onClose', () => {
    renderComponent();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeEnabled();

    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should enable publish when slug is filled in and click it', () => {
    renderComponent();

    const publishButton = screen.getByRole('button', { name: 'Publish' });
    expect(publishButton).toBeDisabled();

    const slugInput = screen.getByRole('textbox', { name: /page name/i });
    expect(slugInput).toHaveValue('');

    fireEvent.change(slugInput, { target: { value: 'donate-now' } });
    expect(slugInput).toHaveValue('donate-now');
    expect(publishButton).toBeEnabled();

    fireEvent.click(publishButton);
    expect(onPublish).toHaveBeenCalled();
  });
});
