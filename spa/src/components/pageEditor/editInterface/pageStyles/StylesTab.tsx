import { ColorPicker, MenuItem, OffscreenText, SearchableSelect, TextField } from 'components/base';
import useFontList from 'hooks/useFontList';
import { Style } from 'hooks/useStyleList';
import PropTypes, { InferProps } from 'prop-types';
import { Flex, Pickers, Section, Title, FullLine, FontSizeTextField } from './StylesTab.styled';
import { ContributionPage } from 'hooks/useContributionPage/useContributionPage.types';
import ImageUpload from 'components/base/ImageUpload/ImageUpload';
import { isValidWebUrl } from 'utilities/isValidWebUrl';

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
  headerThumbnail: ContributionPage['header_logo_thumbnail'];
  headerLogo: ContributionPage['header_logo'];
  headerLink: ContributionPage['header_link'];
  headerAltText: ContributionPage['header_logo_alt_text'];
  onChangePage: (changes: Partial<ContributionPage>) => void;
  styles: Style;
  setStyles: (styles: Style) => void;
}

function StylesTab({
  headerThumbnail,
  headerLogo,
  headerLink,
  headerAltText,
  styles,
  setStyles,
  onChangePage
}: StylesTabProps) {
  const showLogoInput = (headerThumbnail && headerLogo) || headerLogo;

  const { fonts, isLoading: fontLoading } = useFontList();

  // While fontSize is an array, select font corresponding index to the Heading font
  const headingFontSize = parseInt(styles.fontSizes[3]);

  const setColor = (colorName: string, value: string) => {
    setStyles({ ...styles, colors: { ...styles.colors, [colorName]: value } });
  };

  const setSelectedFonts = (fontType: string, selectedFont: (typeof fonts)[number]) => {
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
        <Title>Logo</Title>
        <FullLine>
          <ImageUpload
            id="page-style-header-logo"
            onChange={(file, thumbnailUrl) => onChangePage({ header_logo: file, header_logo_thumbnail: thumbnailUrl })}
            label={
              <OffscreenText>
                <label htmlFor="page-style-header-logo">Main header logo</label>
              </OffscreenText>
            }
            prompt="Choose an image"
            thumbnailUrl={headerThumbnail}
            value={headerLogo}
          />
          {showLogoInput && (
            <>
              <TextField
                id="page-style-header-logo-link"
                label="Logo Link"
                placeholder="e.g. https://www.fundjournalism.org"
                onChange={(e) => onChangePage({ header_link: e.target.value })}
                value={headerLink}
                error={!isValidWebUrl(headerLink, true)}
                helperText={!isValidWebUrl(headerLink, true) && 'Please enter a valid URL.'}
              />
              <TextField
                id="page-style-header-logo-alt-text"
                label="Logo Alt Text"
                placeholder="Enter logo text to assist screen readers"
                onChange={(e) => onChangePage({ header_logo_alt_text: e.target.value })}
                value={headerAltText}
              />
            </>
          )}
        </FullLine>
      </Section>
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
          <FontSizeTextField
            data-testid="heading-font-select"
            id="styles-tab-font-size"
            label="Font Size"
            placeholder="Select font size"
            select
            onChange={({ target }) => setFontSize(parseInt(target.value) as AllowedFontSizes)}
            value={headingFontSize}
          >
            {FONT_SIZE_OPTIONS.map(({ label, value }) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </FontSizeTextField>
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
