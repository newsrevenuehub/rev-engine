import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import CancelContributionModal from './CancelContributionModal';

const onClose = jest.fn();
const onSubmit = jest.fn();

function tree() {
  return render(<CancelContributionModal open onClose={onClose} onSubmit={onSubmit} />);
}

describe('CancelContributionModal', () => {
  it('should render copy', () => {
    tree();
    expect(screen.getByText('Cancel Payment')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your contribution has a direct impact on the work that we do. Are you sure you want to cancel your contribution?'
      )
    ).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    tree();
    expect(screen.getByRole('button', { name: 'No, continue giving' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Yes, cancel' })).toBeEnabled();
  });

  it('should call onClose when close button is clicked', async () => {
    tree();
    expect(onClose).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'No, continue giving' }).click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSubmit when submit button is clicked', async () => {
    tree();
    expect(onSubmit).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Yes, cancel' }).click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
