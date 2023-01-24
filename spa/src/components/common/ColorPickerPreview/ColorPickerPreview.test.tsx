import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import ColorPickerPreview, { ColorPickerPreviewProps } from './ColorPickerPreview';

const colors = {
  headerColor: '#000000',
  backgroundColor: '#523A5E',
  panelBackgroundColor: '#F2FF59',
  buttonsColor: '#60E0F9',
  accentsColor: '#008E7C'
};

describe('ColorPickerPreview', () => {
  function tree(props?: Partial<ColorPickerPreviewProps>) {
    return render(<ColorPickerPreview {...colors} {...props} />);
  }

  it.each(Object.entries(colors))('should apply %s as %p', (key, color) => {
    tree();
    screen.getAllByTestId(key).forEach((result) => expect(result).toHaveStyle(`background-color: ${color}`));
  });

  it.each([
    ['default', 'inputBorderColor', '#c4c4c4', undefined],
    ['default', 'inputBackgroundColor', '#f9f9f9', undefined],
    ['custom', 'inputBorderColor', '#a1b2c3', '#a1b2c3'],
    ['custom', 'inputBackgroundColor', '#f1d2e3', '#f1d2e3']
  ])('should apply %s %s as %s', (_, field, expected, prop) => {
    tree(prop ? { [field]: prop } : undefined);
    screen
      .getAllByTestId('inputBackgroundColor')
      .forEach((result) =>
        expect(result).toHaveStyle(
          field === 'inputBorderColor' ? `border: 1px solid ${expected}` : `background-color: ${expected}`
        )
      );
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
