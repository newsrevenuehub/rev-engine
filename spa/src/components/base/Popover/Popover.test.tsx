import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Popover, { PopoverProps } from './Popover';

function tree(props?: Partial<PopoverProps>) {
  return render(
    <Popover open {...props}>
      <p>text</p>
    </Popover>
  );
}

describe('Popover', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('displays a Popover', () => {
    tree();
    expect(screen.getByRole('presentation')).toBeInTheDocument();
    expect(screen.getByText('text')).toBeInTheDocument();
  });

  it('does not display a Popover if open = false', () => {
    tree({ open: false });
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByText('text')).not.toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
