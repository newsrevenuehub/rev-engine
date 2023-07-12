import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import StyleButton, { StyleButtonProps } from './StyleButton';

const mockStyle: any = {
  name: 'mock-style-name'
};

function tree(props?: Partial<StyleButtonProps>) {
  return render(<StyleButton style={mockStyle} {...props} />);
}

describe('StyleButton', () => {
  it('displays a button with the style name', () => {
    tree();
    expect(screen.getByRole('button', { name: 'mock-style-name' })).toBeVisible();
  });

  it('calls the onClick prop when the button is clicked', () => {
    const onClick = jest.fn();

    tree({ onClick });
    expect(onClick).not.toBeCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toBeCalledTimes(1);
  });

  it('displays a live badge if the style is live', () => {
    tree({ style: { ...mockStyle, used_live: true } as any });
    expect(screen.getByLabelText('Live')).toBeVisible();
  });

  it("doesn't display a live badge if the style isn't live", () => {
    tree({ style: { ...mockStyle, used_live: false } as any });
    expect(screen.queryByLabelText('Live')).not.toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
