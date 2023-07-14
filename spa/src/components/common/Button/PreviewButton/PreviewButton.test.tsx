import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import { PreviewButton, PreviewButtonProps } from './PreviewButton';

function tree(props?: Partial<PreviewButtonProps>) {
  return render(<PreviewButton label="mock-label" {...props} />);
}

describe('PreviewButtonProps', () => {
  it('displays the label', () => {
    tree({ label: 'label' });
    expect(screen.getByText('label')).toBeInTheDocument();
  });

  it('displays the preview content', () => {
    tree({ preview: <div data-testid="mock-preview" /> });
    expect(screen.getByTestId('mock-preview')).toBeInTheDocument();
  });

  it('displays the corner content', () => {
    tree({ corner: <div data-testid="mock-corner" /> });
    expect(screen.getByTestId('mock-corner')).toBeInTheDocument();
  });

  it('enables the button by default', () => {
    tree();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('disables the button if the disabled property is set', () => {
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

  describe('When ariaLabel is set', () => {
    it('sets aria-label on the button', () => {
      tree({ ariaLabel: 'label' });
      expect(screen.getByRole('button', { name: 'label' })).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({ ariaLabel: 'label' });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('is accessible when the preview content has text content', async () => {
    const { container } = tree({ preview: 'label' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
