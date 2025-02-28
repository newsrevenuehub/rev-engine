import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import FreePlanContent, { FreePlanContentProps } from './FreePlanContent';
import { SETTINGS } from 'routes';

jest.mock('../../ModalUpgradePrompt/ModalUpgradePrompt');

function tree(props?: Partial<FreePlanContentProps>) {
  return render(<FreePlanContent onClose={jest.fn()} {...props} />);
}

describe('FreePlanContent', () => {
  it('shows an intro', () => {
    tree();
    expect(screen.getByTestId('intro')).toBeVisible();
  });

  it('shows a prompt to upgrade', () => {
    tree();
    expect(screen.getByTestId('mock-modal-upgrade-prompt')).toHaveTextContent(
      'Upgrade for integrated email marketing and more features!'
    );
  });

  it('shows a button that calls the onClose prop', () => {
    const onClose = jest.fn();

    tree({ onClose });
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Maybe Later' }));
    expect(onClose).toBeCalledTimes(1);
  });

  it('shows an Upgrade button that navigates to the subscription route', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Upgrade' })).toHaveAttribute('href', SETTINGS.SUBSCRIPTION);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
