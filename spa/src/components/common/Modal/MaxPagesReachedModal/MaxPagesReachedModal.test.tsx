import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import MaxPagesReachedModal, { MaxPagesReachedModalProps } from './MaxPagesReachedModal';

function tree(props?: Partial<MaxPagesReachedModalProps>) {
  return render(<MaxPagesReachedModal currentPlan="FREE" onClose={jest.fn()} {...props} />);
}

describe('MaxPagesReachedModal', () => {
  it('displays nothing if the open prop is false', () => {
    tree({ open: false });
    expect(document.body).toHaveTextContent('');
  });

  it('displays a modal when open', () => {
    tree({ open: true });
    expect(screen.getByText('Max Pages Reached')).toBeVisible();
  });

  it('shows a message stating that the user has run out of pages for their plan', () => {
    tree({ currentPlan: 'FREE', open: true });
    expect(screen.getByTestId('plan-limit')).toHaveTextContent(
      "You've reached the maximum number of pages for the Free tier."
    );
  });

  it('shows a message recommending the recommendedPlan prop', () => {
    tree({ recommendedPlan: 'PLUS', open: true });
    expect(screen.getByTestId('recommendation')).toHaveTextContent('Want to create more pages? Check out Plus.');
  });

  it('shows a link to upgrade', () => {
    tree({ open: true });

    const link = screen.getByRole('link', { name: 'Upgrade' });

    expect(link).toHaveAttribute('href', 'https://fundjournalism.org/news-revenue-engine-help/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('calls the onClose prop when the modal is closed', () => {
    const onClose = jest.fn();

    tree({ onClose, open: true });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toBeCalled();
  });

  it('calls the onClose prop when the Maybe Later button is clicked', () => {
    const onClose = jest.fn();

    tree({ onClose, open: true });
    fireEvent.click(screen.getByRole('button', { name: 'Maybe Later' }));
    expect(onClose).toBeCalled();
  });

  it('is accessible', async () => {
    const { container } = tree({ open: true });

    expect(await axe(container)).toHaveNoViolations();
  });
});
