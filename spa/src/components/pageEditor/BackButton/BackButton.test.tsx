import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import { render, screen } from 'test-utils';
import { BackButton, BackButtonProps } from './BackButton';
import { CONTENT_SLUG } from 'routes';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),

  // This mock allows for manually checking the return value of the message prop
  // without re-rendering. It's ARIA hidden because the button has no text.

  Prompt: ({ message }: { message: () => string | boolean }) => (
    <button
      aria-hidden
      data-testid="mock-prompt"
      data-message={message()}
      onClick={(event) => ((event.target as HTMLElement).dataset.message = message().toString())}
    />
  ),
  useHistory: jest.fn()
}));

const useHistoryMock = jest.mocked(useHistory);

function tree(props?: Partial<BackButtonProps>) {
  return render(<BackButton {...props} />);
}

describe('BackButton', () => {
  let historyPushMock: jest.Mock;

  beforeEach(() => {
    historyPushMock = jest.fn();
    useHistoryMock.mockReturnValue({ push: historyPushMock });
  });

  describe('When not confirming navigation', () => {
    it('shows a button labeled Exit', () => {
      tree();
      expect(screen.getByRole('button', { name: 'Exit' })).toBeVisible();
    });

    it('goes to CONTENT_SLUG immediately when clicked', () => {
      tree();
      expect(historyPushMock).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Exit' }));
      expect(historyPushMock.mock.calls).toEqual([[CONTENT_SLUG]]);
    });

    it("doesn't prompt the user if they navigate to another route", () => {
      tree();
      expect(screen.getByTestId('mock-prompt').dataset.message).toBe('true');
    });

    it("doesn't prompt the user if they navigate outside of the app", () => {
      // Using native properties like returnValue and defaultPrevented doesn't
      // seem to work. Using jest spies here instead.
      const event: BeforeUnloadEvent = new Event('beforeunload');

      tree();
      event.preventDefault = jest.fn();
      window.dispatchEvent(event);
      expect(event.preventDefault).not.toBeCalled();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When confirming navigation', () => {
    it('shows a button labeled Exit', () => {
      tree({ confirmNavigation: true });
      expect(screen.getByRole('button', { name: 'Exit' })).toBeVisible();
    });

    it('shows an unsaved changes modal when clicked', () => {
      tree({ confirmNavigation: true });
      userEvent.click(screen.getByRole('button', { name: 'Exit' }));
      expect(screen.getByText('Unsaved Changes')).toBeVisible();
    });

    it('closes the unsaved changes modal if the user cancels out of it', () => {
      tree({ confirmNavigation: true });
      userEvent.click(screen.getByRole('button', { name: 'Exit' }));
      expect(screen.getByText('Unsaved Changes')).toBeVisible();
      userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });

    it('goes to CONTENT_SLUG without further confirmation if the user confirms the navigation in the unsaved changes modal', () => {
      tree({ confirmNavigation: true });
      userEvent.click(screen.getByRole('button', { name: 'Exit' }));
      expect(historyPushMock).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Yes, exit' }));
      expect(historyPushMock.mock.calls).toEqual([[CONTENT_SLUG]]);

      // We need to simulate the update manually because it relies on a ref in
      // the component, which won't trigger a re-render.

      userEvent.click(screen.getByTestId('mock-prompt'));
      expect(screen.getByTestId('mock-prompt').dataset.message).toBe('true');
    });

    it('prompts the user if they navigate to another route', () => {
      tree({ confirmNavigation: true });
      expect(screen.getByTestId('mock-prompt').dataset.message).toBe(
        'Are you sure you want to exit without saving your changes?'
      );
    });

    it('prompts the user if they navigate outside of the app', () => {
      // Using native properties like returnValue and defaultPrevented doesn't
      // seem to work. Using jest spies here instead.
      const event: BeforeUnloadEvent = new Event('beforeunload');

      tree({ confirmNavigation: true });
      event.preventDefault = jest.fn();
      window.dispatchEvent(event);
      expect(event.preventDefault).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ confirmNavigation: true });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
