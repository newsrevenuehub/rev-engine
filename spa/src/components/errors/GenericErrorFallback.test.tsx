import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import GenericErrorFallback from './GenericErrorFallback';

function tree() {
  return render(<GenericErrorFallback />);
}

describe('GenericErrorFallback', () => {
  it('shows a button that reloads the page', () => {
    const reload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload }
    });

    tree();
    expect(reload).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
