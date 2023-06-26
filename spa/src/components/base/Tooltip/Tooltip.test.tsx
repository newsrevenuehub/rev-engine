import { act, render, screen } from 'test-utils';
import { axe } from 'jest-axe';
import Tooltip from './Tooltip';

function tree() {
  return render(
    <Tooltip title="Tooltip text" open>
      <span>Tooltip anchor</span>
    </Tooltip>
  );
}

describe('Tooltip', () => {
  afterEach(async () => await act(() => Promise.resolve()));

  // Promise.resolve()s here are to allow for updates to occur.

  it('displays a tooltip', async () => {
    tree();
    expect(screen.getByText('Tooltip text')).toBeVisible();
    await act(() => Promise.resolve());
  });

  it('is accessible', async () => {
    const { container } = tree();

    await act(() => Promise.resolve());
    expect(await axe(container)).toHaveNoViolations();
  });
});
