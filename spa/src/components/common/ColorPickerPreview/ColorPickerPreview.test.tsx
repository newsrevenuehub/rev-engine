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

  it('should apply default inputBorderColor as "#c4c4c4', () => {
    tree();
    screen
      .getAllByTestId('inputBackgroundColor')
      .forEach((result) => expect(result).toHaveStyle(`border: 1px solid #c4c4c4`));
  });

  it('should apply default inputBackgroundColor as "#f9f9f9"', () => {
    tree();
    screen
      .getAllByTestId('inputBackgroundColor')
      .forEach((result) => expect(result).toHaveStyle(`background-color: #f9f9f9`));
  });

  it('should apply custom inputBorderColor as "#a1b2c3"', () => {
    tree({ inputBorderColor: '#a1b2c3' });
    screen
      .getAllByTestId('inputBackgroundColor')
      .forEach((result) => expect(result).toHaveStyle(`border: 1px solid #a1b2c3`));
  });

  it('should apply custom inputBackgroundColor as "#f1d2e3"', () => {
    tree({ inputBackgroundColor: '#f1d2e3' });
    screen
      .getAllByTestId('inputBackgroundColor')
      .forEach((result) => expect(result).toHaveStyle(`background-color: #f1d2e3`));
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
