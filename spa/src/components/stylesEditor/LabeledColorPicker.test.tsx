import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import LabeledColorPicker, { LabeledColorPickerProps } from './LabeledColorPicker';

describe('LabeledColorPicker', () => {
  function tree(props?: Partial<LabeledColorPickerProps>) {
    return render(<LabeledColorPicker onChange={jest.fn()} label="mock-label" value="#ff0000" {...props} />);
  }

  it('displays a color input set to the value prop', () => {
    tree({ value: '#00ff00' });
    expect(document.querySelector('input[type="color"]')).toHaveValue('#00ff00');
  });

  it('displays the label prop', () => {
    tree({ label: 'test-label' });

    // Unclear why testing-library doesn't see this as a label per se.
    // screen.debug() shows what looks like correct HTML structure.

    expect(screen.getByText('test-label')).toBeInTheDocument();
  });

  it('calls onChange when the input is changed', () => {
    const onChange = jest.fn();

    tree({ onChange });
    fireEvent.change(document.querySelector('input[type="color"]')!, { target: { value: '#00ff00' } });
    expect(onChange).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
