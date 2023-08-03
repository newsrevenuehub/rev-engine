import { ColorPicker, SearchableSelect } from 'components/base';
import useFontList from 'hooks/useFontList';
import { Style } from 'hooks/useStyleList';
import PropTypes, { InferProps } from 'prop-types';
import { Flex, Pickers, Section, Title } from './StylesTab.styled';
import Select from 'elements/inputs/Select';

export const COLOR_PICKERS = [
  { field: 'cstm_mainHeader', label: 'Header' },
  { field: 'cstm_mainBackground', label: 'Background' },
  { field: 'cstm_formPanelBackground', label: 'Panel background' },
  { field: 'cstm_CTAs', label: 'Buttons' },
  { field: 'cstm_ornaments', label: 'Accents' }
];

export const FONT_PICKERS = [
  { field: 'heading', label: 'Heading Font' },
  { field: 'body', label: 'Body Font' }
];

export type AllowedFontSizes = 24 | 32 | 36;

type FontSizeOption = { label: string; value: AllowedFontSizes };
const FONT_SIZE_OPTIONS: Array<FontSizeOption> = [
  { label: 'Small', value: 24 },
  { label: 'Standard', value: 32 },
  { label: 'Large', value: 36 }
];

export const BUTTON_RADIUS_BASE_OPTIONS = [
  { label: 'Square', value: 0 },
  { label: 'Semi-round', value: 5 },
  { label: 'Rounded', value: 20 }
];

export interface StylesTabProps extends InferProps<typeof StylesTabPropTypes> {
  styles: Style;
  setStyles: (styles: Style) => void;
}

function StylesTab({ styles, setStyles }: StylesTabProps) {
  const { fonts, isLoading: fontLoading } = useFontList();

  // While fontSize is an array, select font corresponding index to the Heading font
  const headingFontSize = parseInt(styles.fontSizes[3]);

  const setColor = (colorName: string, value: string) => {
    setStyles({ ...styles, colors: { ...styles.colors, [colorName]: value } });
  };

  const setSelectedFonts = (fontType: string, selectedFont: typeof fonts[number]) => {
    setStyles({ ...styles, font: { ...styles.font, [fontType]: selectedFont } });
  };

  const setFontSize = (fontSize: AllowedFontSizes) => {
    const fontSizes = getFontSizesFromFontSize(fontSize);
    setStyles({ ...styles, fontSizes });
  };

  const setRadii = (radiiBase: number) => {
    const radii = getRadiiFromBase(radiiBase);
    setStyles({ ...styles, radii });
  };

  return (
    <Flex>
      <Section>
        <Title>Colors</Title>
        <Pickers>
          {COLOR_PICKERS.map(({ field, label }) => (
            <ColorPicker
              id={`colors-editor-${field}`}
              key={field}
              label={label}
              onChange={(value) => setColor(field, value)}
              value={styles.colors ? styles.colors[field] : ''}
            />
          ))}
        </Pickers>
      </Section>
      <Section>
        <Title>Fonts</Title>
        <Pickers>
          {FONT_PICKERS.map(({ field, label }) => (
            <SearchableSelect
              key={field}
              disabled={fontLoading}
              label={label}
              options={[
                {
                  name: 'Select a font',
                  id: ''
                },
                ...fonts
              ]}
              getOptionLabel={(option) => option.name}
              getOptionDisabled={(option) => option.id === ''}
              getOptionSelected={(option, value) => option.id === value.id}
              onChange={(_, value) => {
                setSelectedFonts(field, fonts.find((font) => font.id === value.id)!);
              }}
              value={fonts.find((font) => font.id === styles.font[field]?.id) ?? { name: 'Select a font', id: '' }}
            />
          ))}
          <Select
            label="Font Size"
            items={FONT_SIZE_OPTIONS}
            selectedItem={FONT_SIZE_OPTIONS.find((option) => option.value === headingFontSize)}
            onSelectedItemChange={({ selectedItem }: { selectedItem: FontSizeOption }) => {
              setFontSize(selectedItem.value);
            }}
            testId="heading-font-select"
            name="revenue_program"
            displayAccessor="label"
            placeholder="Select font size"
            dropdownPosition=""
          />
        </Pickers>
      </Section>
      <Section>
        <Title>Button Style</Title>
        <Pickers>
          <SearchableSelect
            label="Radius"
            options={BUTTON_RADIUS_BASE_OPTIONS}
            getOptionLabel={(option) => option.label}
            onChange={(_, value) => {
              setRadii(value.value);
            }}
            value={
              BUTTON_RADIUS_BASE_OPTIONS.find((option) => option.value === getBaseFromRadii(styles.radii)) ||
              // Set as null = no option selected.
              (null as any)
            }
          />
        </Pickers>
      </Section>
    </Flex>
  );
}

/**
 * Helper functions used in the StyledEditor component
 * */
export function getFontSizesFromFontSize(fontSize: AllowedFontSizes) {
  const firstFontSize = `${0.375 * fontSize}px`;
  const mainValues = {
    24: ['16px', '18px', '24px'],
    32: ['16px', '24px', '32px'],
    36: ['18px', '28px', '36px']
  }[fontSize];
  const afterFactors = [1.5, 2.5, 3];
  return [firstFontSize, ...mainValues, ...afterFactors.map((factor) => `${fontSize * factor}px`)];
}

export function getBaseFromRadii(radii: Array<string>) {
  return parseInt(radii[0]);
}

export function getRadiiFromBase(radiiBase: number) {
  const factoredString = (num: number, factor = 1) => {
    return `${num * factor}px`;
  };
  return [factoredString(radiiBase), factoredString(radiiBase, 2), factoredString(radiiBase, 4)];
}
/**
 * End of Helper functions
 * */

const StylesTabPropTypes = {
  style: PropTypes.object,
  setStyles: PropTypes.func.isRequired
};

StylesTab.propTypes = StylesTabPropTypes;

export default StylesTab;
