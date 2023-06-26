import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import { render, screen } from 'test-utils';
import { BackButton, BackButtonProps } from './BackButton';
import { CONTENT_SLUG } from 'routes';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Prompt: ({ when }: { when: boolean }) => <div data-testid="mock-prompt" data-when={when} />,
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
      expect(screen.getByTestId('mock-prompt').dataset.when).toBe('false');
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

    it('prompts the user if they navigate to another route', () => {
      tree({ confirmNavigation: true });
      expect(screen.getByTestId('mock-prompt').dataset.when).toBe('true');
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
