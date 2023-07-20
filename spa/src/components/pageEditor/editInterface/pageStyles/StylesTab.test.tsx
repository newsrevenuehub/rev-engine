import { axe } from 'jest-axe';
import { donationPageBase } from 'styles/themes';
import { render, screen } from 'test-utils';
import useFontList from 'hooks/useFontList';
import StylesTab, {
  AllowedFontSizes,
  BUTTON_RADIUS_BASE_OPTIONS,
  COLOR_PICKERS,
  FONT_PICKERS,
  StylesTabProps,
  getBaseFromRadii,
  getFontSizesFromFontSize,
  getRadiiFromBase
} from './StylesTab';
import userEvent from '@testing-library/user-event';

jest.mock('components/base/ColorPicker/ColorPicker');
jest.mock('hooks/useFontList');
const setStyles = jest.fn();

const mockStyles = {
  id: 'mock-styles-id' as any,
  name: 'mock-styles-name',
  created: 'mock-created',
  modified: 'mock-modified',
  used_live: 'mock-used_live',
  ...(donationPageBase as any)
} as StylesTabProps['styles'];

const mockFont = {
  id: 'mock-font-id',
  name: 'mock-font-name'
} as any;

function tree(props?: Partial<StylesTabProps>) {
  return render(<StylesTab styles={mockStyles} setStyles={setStyles} {...props} />);
}

describe('StylesTab', () => {
  const useFontListMock = jest.mocked(useFontList);

  beforeEach(() => {
    useFontListMock.mockReturnValue({
      fonts: [mockFont],
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });
  });

  it('should render style tab', () => {
    tree();
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Fonts')).toBeInTheDocument();
    expect(screen.getByText('Button Style')).toBeInTheDocument();
  });

  describe.each(COLOR_PICKERS.map((color) => [color.label, color.field]))('color picker: %s', (label, field) => {
    it(`should render color picker with correct color: ${mockStyles.colors[field]}`, () => {
      tree();
      const colorPickers = screen.getAllByTestId('color-picker');
      expect(colorPickers).toHaveLength(COLOR_PICKERS.length);
      expect(
        colorPickers.find(
          (picker) => picker.dataset.label === label && picker.dataset.value === mockStyles.colors[field]
        )
      ).toBeInTheDocument();
    });

    it('should call setColor on change', () => {
      tree();
      expect(setStyles).not.toHaveBeenCalled();
      screen.getByRole('button', { name: 'color picker ' + label }).click();
      expect(setStyles).toHaveBeenCalledTimes(1);
      expect(setStyles).toHaveBeenCalledWith({
        ...mockStyles,
        colors: { ...mockStyles.colors, [field]: 'mock-color' }
      });
    });
  });

  describe.each(FONT_PICKERS.map((font) => [font.label, font.field]))('font picker: %s', (label, field) => {
    it(`should render font picker with default selection: "Select a font"`, () => {
      tree();
      const select = screen.getByRole('textbox', { name: label });
      expect(select).toBeVisible();
      expect(select).toHaveValue('Select a font');
    });

    it(`should render custom font: "mock-font-name"`, () => {
      tree({ styles: { ...mockStyles, font: { body: mockFont, heading: mockFont } } });
      const select = screen.getByRole('textbox', { name: label });
      expect(select).toBeVisible();
      expect(select).toHaveValue('mock-font-name');
    });

    it('should call setSelectedFonts on change', () => {
      tree();
      expect(setStyles).not.toHaveBeenCalled();
      userEvent.click(screen.getByRole('textbox', { name: label }));

      const option = screen.getByRole('option', { name: 'mock-font-name' });
      expect(option).toBeVisible();
      userEvent.click(option);

      expect(setStyles).toHaveBeenCalledTimes(1);
      expect(setStyles).toHaveBeenCalledWith({
        ...mockStyles,
        font: { ...mockStyles.font, [field]: { id: 'mock-font-id', name: 'mock-font-name' } }
      });
    });
  });

  describe('Font Size', () => {
    it(`should render font size with default selection: "Standard"`, () => {
      tree();
      const select = screen.getByRole('textbox', { name: 'Font Size' });
      expect(select).toBeVisible();
      expect(select).toHaveValue('Standard');
    });

    it.each([
      ['Small', 24],
      ['Large', 36]
    ])(`should render custom font size: "%s"`, (label, fontSize) => {
      tree({ styles: { ...mockStyles, fontSizes: getFontSizesFromFontSize(fontSize as AllowedFontSizes) } });
      const select = screen.getByRole('textbox', { name: 'Font Size' });
      expect(select).toBeVisible();
      expect(select).toHaveValue(label);
    });

    it.each([
      ['Small', 24],
      ['Large', 36]
    ])('should call setFontSize on change with correct params for %s font size', (label, fontSize) => {
      tree();
      expect(setStyles).not.toHaveBeenCalled();
      userEvent.click(screen.getByRole('textbox', { name: 'Font Size' }));

      const option = screen.getByRole('option', { name: label });
      expect(option).toBeVisible();
      userEvent.click(option);

      expect(setStyles).toHaveBeenCalledTimes(1);
      expect(setStyles).toHaveBeenCalledWith({
        ...mockStyles,
        fontSizes: getFontSizesFromFontSize(fontSize as AllowedFontSizes)
      });
    });
  });

  describe('button style: Radius', () => {
    it(`should render radius with default selection: ""`, () => {
      tree();
      const select = screen.getByRole('textbox', { name: 'Radius' });
      expect(select).toBeVisible();
      expect(select).toHaveValue('');
    });

    it.each(BUTTON_RADIUS_BASE_OPTIONS.map((radius) => [radius.label, radius.value]))(
      `should render button radius option: "%s"`,
      (label, radius) => {
        tree({ styles: { ...mockStyles, radii: getRadiiFromBase(radius) } });
        const select = screen.getByRole('textbox', { name: 'Radius' });
        expect(select).toBeVisible();
        expect(select).toHaveValue(label);
      }
    );

    it.each(BUTTON_RADIUS_BASE_OPTIONS.map((radius) => [radius.label, radius.value]))(
      'should call setFontSize on change with correct params for %s font size',
      (label, radius) => {
        tree();
        expect(setStyles).not.toHaveBeenCalled();
        userEvent.click(screen.getByRole('textbox', { name: 'Radius' }));

        const option = screen.getByRole('option', { name: label });
        expect(option).toBeVisible();
        userEvent.click(option);

        expect(setStyles).toHaveBeenCalledTimes(1);
        expect(setStyles).toHaveBeenCalledWith({
          ...mockStyles,
          radii: getRadiiFromBase(radius)
        });
      }
    );
  });

  describe('Helper functions', () => {
    describe('getFontSizesFromFontSize', () => {
      it.each([
        [24, ['9px', '16px', '18px', '24px', '36px', '60px', '72px']],
        [32, ['12px', '16px', '24px', '32px', '48px', '80px', '96px']],
        [36, ['13.5px', '18px', '28px', '36px', '54px', '90px', '108px']]
      ])('should return the correct list for font Heading size: %s', (input, result) => {
        expect(getFontSizesFromFontSize(input as AllowedFontSizes)).toEqual(result);
      });
    });

    describe('getBaseFromRadii', () => {
      it.each([
        [['0px', '0px', '0px'], 0],
        [['5px', '10px', '20px'], 5],
        [['20px', '40px', '80px'], 20]
      ])('should return the correct base radius from radii: %s', (input, result) => {
        expect(getBaseFromRadii(input)).toEqual(result);
      });
    });

    describe('getRadiiFromBase', () => {
      it.each([
        [0, ['0px', '0px', '0px']],
        [5, ['5px', '10px', '20px']],
        [20, ['20px', '40px', '80px']]
      ])('should return the correct radii from base radius: %s', (input, result) => {
        expect(getRadiiFromBase(input)).toEqual(result);
      });
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
