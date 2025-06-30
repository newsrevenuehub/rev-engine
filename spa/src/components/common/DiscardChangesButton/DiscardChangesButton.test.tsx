import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import DiscardChangesButton, { DiscardChangesButtonProps } from './DiscardChangesButton';
import { PromptProps } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),

  Prompt: ({ message, when }: PromptProps) => <div data-testid="mock-prompt" data-message={message} data-when={when} />
}));

function tree(props?: Partial<DiscardChangesButtonProps>) {
  return render(
    <DiscardChangesButton onDiscard={jest.fn()} {...props}>
      child
    </DiscardChangesButton>
  );
}

function navigateAway() {
  // Using native properties like returnValue don't seem to work.
  const event: BeforeUnloadEvent = new Event('beforeunload');

  event.preventDefault = jest.fn();
  window.dispatchEvent(event);
  return event;
}

describe('DiscardChangesButton', () => {
  describe('When the changesPending prop is false', () => {
    it("doesn't show UnsavedChangesModal", () => {
      tree({ changesPending: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls the onDiscard prop when clicked', () => {
      const onDiscard = jest.fn();

      tree({ onDiscard, changesPending: false });
      expect(onDiscard).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button'));
      expect(onDiscard).toBeCalledTimes(1);
    });

    it("doesn't prompt the user if they navigate away to another route", () => {
      tree({ changesPending: false });
      expect(screen.getByTestId('mock-prompt').dataset.when).toBe('false');
    });

    it("doesn't prompt the user if they navigate away from the page", () => {
      tree({ changesPending: false });

      const event = navigateAway();

      expect(event.preventDefault).not.toBeCalled();
    });
  });

  describe('When the changesPending prop is true', () => {
    it('shows UnsavedChangesModal when clicked', () => {
      tree({ changesPending: true });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('calls onDiscard when the user confirms they want to discard changes', () => {
      const onDiscard = jest.fn();

      tree({ onDiscard, changesPending: true });
      fireEvent.click(screen.getByRole('button'));
      expect(onDiscard).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Yes, exit' }));
      expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it("hides the modal and doesn't call onDiscard if the user cancels out of it", () => {
      const onDiscard = jest.fn();

      tree({ onDiscard, changesPending: true });
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onDiscard).not.toHaveBeenCalled();
    });

    it('prompts the user if they navigate away to another route', () => {
      tree({ changesPending: true });
      expect(screen.getByTestId('mock-prompt').dataset.when).toBe('true');
    });

    it('shows the user a prompt if they navigate away from the page', () => {
      tree({ changesPending: true });

      const event = navigateAway();

      expect(event.preventDefault).toBeCalledTimes(1);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
