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

  it('displays a tooltip', async () => {
    tree();
    expect(screen.getByText('Tooltip text')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
