import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ColorsEditor, { ColorsEditorProps } from './ColorsEditor';

jest.mock('components/common/ColorPickerPreview/ColorPickerPreview');

const mockColors = {
  cstm_CTAs: '#111111',
  cstm_formPanelBackground: '#222222',
  cstm_inputBackground: '#333333',
  cstm_inputBorder: '#444444',
  cstm_mainBackground: '#555555',
  cstm_mainHeader: '#666666',
  cstm_ornaments: '#777777'
};

function tree(props?: Partial<ColorsEditorProps>) {
  return render(<ColorsEditor colors={mockColors} onChangeColor={jest.fn()} {...props} />);
}

describe('ColorsEditor', () => {
  describe.each([
    ['cstm_mainHeader', 'Main header'],
    ['cstm_mainBackground', 'Main background'],
    ['cstm_formPanelBackground', 'Form panel background'],
    ['cstm_CTAs', 'CTAs'],
    ['cstm_ornaments', 'Ornaments'],
    ['cstm_inputBackground', 'Input background'],
    ['cstm_inputBorder', 'Input border']
  ])('%s field', (field, label) => {
    it(`displays a color picker with the label ${label} and value in colors prop`, () => {
      tree({ colors: { ...mockColors, [field]: '#123456' } });
      expect(screen.getByRole('textbox', { name: label })).toHaveValue('#123456');
    });

    it('calls onColorChange with the correct color name when changed', () => {
      const onChangeColor = jest.fn();

      tree({ onChangeColor });
      expect(onChangeColor).not.toBeCalled();
      fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value: '#123456' } });
      expect(onChangeColor.mock.calls).toEqual([[field, '#123456']]);
    });
  });

  it('displays a preview of the colors prop', () => {
    tree();

    const mockPreview = screen.getByTestId('mock-color-picker-preview');

    expect(mockPreview).toBeInTheDocument();
    expect(mockPreview.dataset.headerColor).toBe(mockColors.cstm_mainHeader);
    expect(mockPreview.dataset.background).toBe(mockColors.cstm_mainBackground);
    expect(mockPreview.dataset.panelBackground).toBe(mockColors.cstm_formPanelBackground);
    expect(mockPreview.dataset.buttons).toBe(mockColors.cstm_CTAs);
    expect(mockPreview.dataset.accents).toBe(mockColors.cstm_ornaments);
    expect(mockPreview.dataset.inputBackground).toBe(mockColors.cstm_inputBackground);
    expect(mockPreview.dataset.inputBorder).toBe(mockColors.cstm_inputBorder);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
