import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import NewButton, { NewButtonProps } from './NewButton';

function tree(props?: Partial<NewButtonProps>) {
  return render(<NewButton ariaLabel="mock-label" label="mock-label" {...props} />);
}

describe('NewButton', () => {
  // More thorough testing is in <PreviewButton>. This tests that functionality
  // there is still present here.

  it('displays an enabled button by default', () => {
    tree();

    const button = screen.getByRole('button');

    expect(button).toBeVisible();
    expect(button).toBeEnabled();
  });

  it('disables the button if the disabled prop is true', () => {
    tree({ disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls the onClick prop when the button is clicked', () => {
    const onClick = jest.fn();

    tree({ onClick });
    expect(onClick).not.toBeCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
