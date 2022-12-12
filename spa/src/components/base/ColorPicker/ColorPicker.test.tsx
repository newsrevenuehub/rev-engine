import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ColorPicker, { ColorPickerProps } from './ColorPicker';

describe('ColorPicker', () => {
  function tree(props?: Partial<ColorPickerProps>) {
    return render(
      <>
        <label htmlFor="test-picker">mock label</label>
        <ColorPicker id="test-picker" onChange={jest.fn()} value="#ff0000" {...props} />
      </>
    );
  }

  function getColorInput() {
    return document.querySelector('input[type="color"]');
  }

  it('displays a color input', () => {
    tree();
    expect(getColorInput()).toBeInTheDocument();
    expect(screen.getByLabelText('mock label')).toBeVisible();
  });

  it('sets the ID on the input with the id prop', () => {
    tree({ id: 'test-id' });
    expect(document.getElementById('test-id')).toBeVisible();
  });

  it("sets the input's value to the value prop", () => {
    tree({ value: '#00ff00' });
    expect(getColorInput()).toHaveValue('#00ff00');
  });

  it('displays the value prop', () => {
    tree({ value: '#00ff00' });
    expect(screen.getByText('#00ff00')).toBeVisible();
  });

  it('calls onChange when the value of the input is changed', () => {
    const onChange = jest.fn();

    tree({ onChange });
    expect(onChange).not.toBeCalled();
    fireEvent.change(getColorInput()!, { target: { value: '#0000ff' } });
    expect(onChange).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
