import { render, screen, fireEvent, waitFor } from 'test-utils';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import PublishButton from './PublishButton';
import getDomain from 'utilities/getDomain';

const unpublishedPage = {
  name: 'Donation page',
  revenue_program: {
    slug: 'news-revenue-hub'
  },
  payment_provider: {
    stripe_verified: true
  }
};

const disabledPage = {
  ...unpublishedPage,
  payment_provider: {}
};

const publishedPage = {
  ...unpublishedPage,
  slug: 'published-page',
  published_date: '2021-11-18T21:51:53Z'
};

const setPage = jest.fn();
const requestPatchPage = jest.fn();
const domain = getDomain(window.location.host);

describe('PublishButton', () => {
  it('should render publish button', () => {
    render(<PublishButton page={unpublishedPage} setPage={setPage} requestPatchPage={requestPatchPage} />);

    const button = screen.getByRole('button', { name: /Publish/i });
    expect(button).toBeEnabled();
  });

  it('should open publish modal when clicked', async () => {
    render(<PublishButton page={unpublishedPage} setPage={setPage} requestPatchPage={requestPatchPage} />);

    const button = screen.getByRole('button', { name: /Publish/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => {
      const modal = screen.getByRole('presentation');
      expect(modal).toBeVisible();
    });
  });

  it('should be disabled if no payment provider (stripe)', async () => {
    render(<PublishButton page={disabledPage} setPage={setPage} requestPatchPage={requestPatchPage} />);

    const button = screen.getByRole('button', { name: /Publish/i });
    expect(button).toBeDisabled();
  });

  it('should show tooltip if button disabled and hovered', async () => {
    render(<PublishButton page={disabledPage} setPage={setPage} requestPatchPage={requestPatchPage} />);

    const buttonWrapper = screen.getByTestId('publish-button-wrapper');
    userEvent.hover(buttonWrapper);

    await waitFor(() => {
      expect(screen.getByText(/Connect to Stripe to publish page/i)).toBeInTheDocument();
    });
  });

  it('should show disabled published button if published_date', () => {
    render(<PublishButton page={publishedPage} setPage={setPage} requestPatchPage={requestPatchPage} />);

    const button = screen.getByRole('button', { name: /Published/i });
    expect(button).toBeEnabled();
  });

  it('should open popover if published and clicked', async () => {
    render(<PublishButton page={publishedPage} setPage={setPage} requestPatchPage={requestPatchPage} />);

    const button = screen.getByRole('button', { name: /Published/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/live/i)).toBeVisible();
    });

    const liveSince = `${formatDatetimeForDisplay(publishedPage.published_date)} at ${formatDatetimeForDisplay(
      publishedPage.published_date,
      true
    )}`;
    expect(screen.getByText(liveSince)).toBeVisible();

    const goToPageButton = screen.getByRole('link', { name: /page link/i });
    expect(goToPageButton).toBeEnabled();
    expect(goToPageButton).toHaveAttribute(
      'href',
      `https://${publishedPage?.revenue_program?.slug}.${domain}/${publishedPage?.slug}`
    );
  });

  it('should be accessible', async () => {
    const { container } = render(
      <PublishButton page={publishedPage} setPage={setPage} requestPatchPage={requestPatchPage} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
