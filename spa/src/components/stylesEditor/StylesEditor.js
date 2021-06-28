import { useState } from 'react';
import { HelpText, Label } from 'elements/inputs/BaseField.styled';
import * as S from './StylesEditor.styled';

// AJAX
import axios from 'ajax/axios';
import { PAGE_STYLES } from 'ajax/endpoints';

// Assets
import { faSave, faTrash } from '@fortawesome/free-solid-svg-icons';

// Deps
import { GENERIC_ERROR } from 'constants/textConstants';
import { useAlert } from 'react-alert';
import { ChromePicker } from 'react-color';

// Children
import XButton from 'elements/buttons/XButton';
import CircleButton from 'elements/buttons/CircleButton';

function StylesEditor({ styles, setStyles, handleKeepChanges, handleDiscardChanges }) {
  const alert = useAlert();
  const setName = (name) => {
    setStyles({ ...styles, name });
  };

  const setColor = (colorName, color) => {
    setStyles({ ...styles, colors: { ...styles.colors, [colorName]: color.hex } });
  };

  const setRadii = (_e, radiiBase) => {
    const radii = getRadiiFromBase(radiiBase);
    setStyles({ ...styles, radii });
  };

  const setFontFamily = (fontFamily) => {
    const font = getStyleFromFontFamily(fontFamily);
    setStyles({ ...styles, font });
  };

  const setFontSize = (fontSize) => {
    const fontSizes = getFontSizesFromFontSize(fontSize);
    setStyles({ ...styles, fontSizes });
  };

  const handleSave = async () => {
    try {
      const { data } = await axios.post(PAGE_STYLES, styles);
      handleKeepChanges(data);
    } catch (e) {
      alert.error(GENERIC_ERROR);
    }
  };

  const handleDiscard = () => {
    handleDiscardChanges();
  };

  return (
    <S.StylesEditor>
      <S.StylesForm>
        <S.NameInput
          label="Name this set of styles"
          value={styles.name || ''}
          onChange={(e) => setName(e.target.value)}
        />
        <StylesFieldset label="Colors">
          <S.FieldRow>
            <ColorPicker
              label="Primary"
              value={styles?.colors?.primary || ''}
              onChange={(color) => setColor('primary', color)}
            />
            <ColorPicker
              label="Secondary"
              value={styles?.colors?.secondary || ''}
              onChange={(color) => setColor('secondary', color)}
            />
          </S.FieldRow>
          <S.FieldRow>
            <ColorPicker
              label="Main background"
              value={styles?.colors?.fieldBackground || ''}
              onChange={(color) => setColor('fieldBackground', color)}
            />
            <ColorPicker
              label="Pane background"
              value={styles?.colors?.paneBackground || ''}
              onChange={(color) => setColor('paneBackground', color)}
            />
          </S.FieldRow>
          <S.FieldRow>
            <ColorPicker
              label="Input background"
              value={styles?.colors?.inputBackground || ''}
              onChange={(color) => setColor('inputBackground', color)}
            />
            <ColorPicker
              label="Input border"
              value={styles?.colors?.inputBorder || ''}
              onChange={(color) => setColor('inputBorder', color)}
            />
          </S.FieldRow>
        </StylesFieldset>
        <StylesFieldset label="Font">
          <S.TextExample newStyles={styles}>
            <h2>The quick brown fox jumps over the lazy dog.</h2>
            <h4>The quick brown fox jumps over the lazy dog.</h4>
            <h5>The quick brown fox jumps over the lazy dog.</h5>
            <p>The quick brown fox jumps over the lazy dog.</p>
          </S.TextExample>
          <S.FieldRow>
            <FontFamilyPicker fontFamily={getFontFamilyFromStyle(styles.font)} setFontFamily={setFontFamily} />
          </S.FieldRow>
          <S.FieldRow>
            <SliderPicker
              label="Font size"
              value={getFontSizeFromFontSizes(styles.fontSizes)}
              onChange={(_e, size) => setFontSize(size)}
              min={12}
              max={18}
              step={2}
              marks={fontSizeMarks}
            />
          </S.FieldRow>
        </StylesFieldset>
        <StylesFieldset label="Other">
          <S.FieldRow>
            <SliderPicker
              label="Border radii"
              value={getBaseFromRadii(styles.radii)}
              onChange={setRadii}
              min={1}
              max={12}
            />
          </S.FieldRow>
        </StylesFieldset>
      </S.StylesForm>
      <S.Buttons>
        <CircleButton onClick={handleSave} icon={faSave} type="neutral" data-testid="save-styles-button" />
        <CircleButton onClick={handleDiscard} icon={faTrash} type="neutral" data-testid="discard-styles-button" />
      </S.Buttons>
    </S.StylesEditor>
  );
}

export default StylesEditor;

function StylesFieldset({ label, description, children, ...props }) {
  return (
    <S.StylesFieldset {...props}>
      {label && <S.FieldsetLabel>{label}</S.FieldsetLabel>}
      {description && <S.FieldsetDescription>{description}</S.FieldsetDescription>}
      {children}
    </S.StylesFieldset>
  );
}

function ColorPicker({ label, helpText, value, onChange }) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [internalValue, setIntervalValue] = useState({ hex: value });

  const closePicker = () => {
    onChange(internalValue);
    setColorPickerOpen(false);
  };

  return (
    <>
      <S.ColorPickerWrapper>
        {label && <Label>{label}</Label>}
        <S.ColorButtonWrapper>
          <S.ColorButton onClick={() => setColorPickerOpen(true)}>
            <S.ColorButtonSwatch color={internalValue.hex || '#fff'} />
            <S.ColorButtonHex color={internalValue.hex || '#fff'}>
              {internalValue.hex || <S.NoColor>Select a color...</S.NoColor>}
            </S.ColorButtonHex>
          </S.ColorButton>
          <XButton />
        </S.ColorButtonWrapper>
        {helpText && <HelpText>{helpText}</HelpText>}
        {colorPickerOpen && (
          <S.PickerWrapper>
            <ChromePicker color={internalValue} onChange={setIntervalValue} disableAlpha />
          </S.PickerWrapper>
        )}
      </S.ColorPickerWrapper>
      {colorPickerOpen && <S.PickerOverlay onClick={closePicker} />}
    </>
  );
}

function SliderPicker({ label, value, onChange, ...props }) {
  return (
    <S.SliderWrapper>
      {label && <Label>{label}</Label>}
      <S.SliderBox radius={value}>
        <S.Slider value={value} onChange={onChange} {...props} />
      </S.SliderBox>
    </S.SliderWrapper>
  );
}

function getRadiiFromBase(radiiBase) {
  const factoredString = (num, factor = 1) => {
    return `${num * factor}px`;
  };
  return [factoredString(radiiBase), factoredString(radiiBase, 2), factoredString(radiiBase, 4)];
}

function getBaseFromRadii(radii) {
  if (radii && radii[0]) {
    return parseInt(radii[0], 10);
  }
  return 1;
}

const SANS_SERIF = 'SANS_SERIF';
const SERIF = 'SERIF';
const MONOSPACE = 'MONOSPACE';

function FontFamilyPicker({ fontFamily, setFontFamily }) {
  return (
    <S.FieldRow>
      <S.Checkbox label="Serif" toggle checked={fontFamily === SERIF} onChange={() => setFontFamily(SERIF)} />
      <S.Checkbox
        label="Sans-serif"
        toggle
        checked={fontFamily === SANS_SERIF}
        onChange={() => setFontFamily(SANS_SERIF)}
      />
      <S.Checkbox
        label="Monospace"
        toggle
        checked={fontFamily === MONOSPACE}
        onChange={() => setFontFamily(MONOSPACE)}
      />
    </S.FieldRow>
  );
}

function getFontFamilyFromStyle(fontStyle) {
  if (fontStyle.includes('sans')) return SANS_SERIF;
  else if (fontStyle.includes('serif')) return SERIF;
  else if (fontStyle.includes('monospace')) return MONOSPACE;
}

function getStyleFromFontFamily(fontFamily) {
  if (fontFamily === SANS_SERIF) return "'Montserrat', sans-serif";
  else if (fontFamily === SERIF) return "'Times New Roman', serif";
  else if (fontFamily === MONOSPACE) return "'Courier New', monospace";
}

function getFontSizesFromFontSize(fontSize) {
  const factors = [0.75, 1, 1.5, 2, 3, 5, 6];
  return factors.map((factor) => `${fontSize * factor}px`);
}

function getFontSizeFromFontSizes(fontSizes) {
  return parseInt(fontSizes[1], 10);
}

const fontSizeMarks = [
  {
    value: 12,
    label: '12px'
  },
  {
    value: 14,
    label: '14px'
  },
  {
    value: 16,
    label: '16px'
  },
  {
    value: 18,
    label: '18px'
  }
];
