import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import { fireEvent, render, screen } from 'test-utils';
import { BackButton, BackButtonProps } from './BackButton';
import { CONTENT_SLUG } from 'routes';

jest.mock('components/common/DiscardChangesButton');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));

function tree(props?: Partial<BackButtonProps>) {
  return render(<BackButton {...props} />);
}

describe('BackButton', () => {
  const useHistoryMock = jest.mocked(useHistory);
  let historyPushMock: jest.Mock;

  beforeEach(() => {
    historyPushMock = jest.fn();
    useHistoryMock.mockReturnValue({ push: historyPushMock });
  });

  it.each([[true], [false]])('passes through a %s changesPending prop to DiscardChangesButton', (changesPending) => {
    tree({ changesPending });
    expect(screen.getByTestId('mock-discard-changes-button').dataset.changesPending).toBe(changesPending.toString());
  });

  it('navigates to the list of pages when confirmed', () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
    expect(historyPushMock.mock.calls).toEqual([[CONTENT_SLUG]]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
