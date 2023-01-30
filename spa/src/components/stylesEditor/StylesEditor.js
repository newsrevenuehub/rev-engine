import { useState, useEffect } from 'react';
import { HelpText, Label } from 'elements/inputs/BaseField.styled';
import * as S from './StylesEditor.styled';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES, LIST_FONTS } from 'ajax/endpoints';

// Assets
import { faSave, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

// Deps
import { GENERIC_ERROR } from 'constants/textConstants';
import { useAlert } from 'react-alert';
import { ChromePicker } from 'react-color';

// Hooks
import useWebFonts from 'hooks/useWebFonts';
import useUser from 'hooks/useUser';

// Context
import { useConfirmationModalContext } from 'elements/modal/GlobalConfirmationModal';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import Select from 'elements/inputs/Select';
import ColorPickerPreview from 'components/common/ColorPickerPreview';

const UNIQUE_NAME_ERROR = 'The fields name, organization must make a unique set.';

const PANGRAM = 'The quick brown fox jumps over the lazy dog.';

function StylesEditor({ styles, setStyles, handleKeepChanges, handleDiscardChanges, isUpdate, styleNameInputId }) {
  const alert = useAlert();
  const getUserConfirmation = useConfirmationModalContext();
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableFonts, setAvailableFonts] = useState([]);

  const {
    user: { revenue_programs: availableRevenuePrograms }
  } = useUser();

  const requestGetFonts = useRequest();

  const requestCreateStyles = useRequest();
  const requestUpdateStyles = useRequest();
  const requestDeleteStyles = useRequest();

  useWebFonts(styles.font);

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

  const setSelectedFonts = (fontType, selectedFont) => {
    let font = {};
    if (typeof styles.font !== 'string') {
      font = { ...styles.font };
    }
    font[fontType] = selectedFont;
    setStyles({ ...styles, font });
  };

  const setFontSize = (fontSize) => {
    const fontSizes = getFontSizesFromFontSize(fontSize);
    setStyles({ ...styles, fontSizes });
  };

  /*************\
   * AJAX BITS *
  \*************/
  useEffect(() => {
    setLoading(true);
    requestGetFonts(
      { method: 'GET', url: LIST_FONTS },
      {
        onSuccess: ({ data }) => {
          setLoading(false);
          setAvailableFonts(data);
        },
        onFailure: () => {
          setLoading(false);
          alert.error(GENERIC_ERROR);
        }
      }
    );
  }, [alert, requestGetFonts]);

  const styleDetailUrl = `${LIST_STYLES}${styles.id}/`;

  const handleRequestSuccess = ({ data }) => {
    setLoading(false);
    handleKeepChanges(data);
  };

  const handleRequestError = (error) => {
    setLoading(false);
    const errors = error?.response?.data;
    if (errors) {
      if (errors.non_field_errors && errors.non_field_errors.includes(UNIQUE_NAME_ERROR)) {
        errors.name = 'This name is already taken';
      }
      setErrors(errors);
    } else {
      alert.error(GENERIC_ERROR);
    }
  };

  const handleCreateStyles = () => {
    setLoading(true);
    const postData = { ...styles, revenue_program: styles.revenue_program?.id };
    requestCreateStyles(
      { method: 'POST', url: LIST_STYLES, data: postData },
      {
        onSuccess: handleRequestSuccess,
        onFailure: handleRequestError
      }
    );
  };

  const handleUpdateStyles = () => {
    setLoading(true);
    const patchData = { ...styles, revenue_program: styles.revenue_program.id };
    requestUpdateStyles(
      { method: 'PATCH', url: styleDetailUrl, data: patchData },
      {
        onSuccess: handleRequestSuccess,
        onFailure: handleRequestError
      }
    );
  };

  const handleSave = async () => {
    if (isUpdate) {
      handleUpdateStyles();
    } else {
      handleCreateStyles();
    }
  };

  const handleDiscard = () => {
    handleDiscardChanges();
  };

  const deleteStyles = () => {
    requestDeleteStyles(
      {
        method: 'DELETE',
        url: styleDetailUrl
      },
      {
        onSuccess: handleRequestSuccess,
        onFailure: handleRequestError
      }
    );
  };

  const handleDelete = () => {
    if (styles.used_live) {
      getUserConfirmation('This set of styles is used on a live page. Are you sure want to delete it?', deleteStyles);
    } else {
      deleteStyles();
    }
  };

  return (
    <S.StylesEditor>
      <S.StylesForm>
        <S.FieldRow>
          <S.NameInput
            label="Name this set of styles"
            value={styles.name || ''}
            onChange={(e) => setName(e.target.value)}
            errors={errors.name}
            required
            data-testid="style-name-input"
          />
        </S.FieldRow>
        {!isUpdate && (
          <Select
            errors={errors.revenue_program}
            label="Select a revenue program"
            items={availableRevenuePrograms}
            // if no selected item, need to default to object with empty string for name
            // otherwise initial value will be undefined, and when updated,
            // will cause a warning re: changing from uncontrolled to controlled.
            selectedItem={styles.revenue_program || { id: null, name: '' }}
            onSelectedItemChange={({ selectedItem }) => {
              setStyles({ ...styles, revenue_program: selectedItem });
            }}
            testId="heading-font-select"
            name="revenue_program"
            placeholder="Select a revenue program"
            displayAccessor="name"
          />
        )}
        <StylesFieldset label="Colors">
          <S.ColorsWrapper>
            <div>
              <S.FieldRow>
                <ColorPicker
                  label="Main header"
                  value={styles?.colors?.cstm_mainHeader || ''}
                  onChange={(color) => setColor('cstm_mainHeader', color)}
                />
              </S.FieldRow>
              <S.FieldRow>
                <ColorPicker
                  label="Main background"
                  value={styles?.colors?.cstm_mainBackground || ''}
                  onChange={(color) => setColor('cstm_mainBackground', color)}
                />
                <ColorPicker
                  label="Form panel background"
                  value={styles?.colors?.cstm_formPanelBackground || ''}
                  onChange={(color) => setColor('cstm_formPanelBackground', color)}
                />
              </S.FieldRow>
              <S.FieldRow>
                <ColorPicker
                  label="CTAs"
                  value={styles?.colors?.cstm_CTAs || ''}
                  onChange={(color) => setColor('cstm_CTAs', color)}
                />
                <ColorPicker
                  label="Ornaments"
                  value={styles?.colors?.cstm_ornaments || ''}
                  onChange={(color) => setColor('cstm_ornaments', color)}
                />
              </S.FieldRow>
              <S.FieldRow>
                <ColorPicker
                  label="Input background"
                  value={styles?.colors?.cstm_inputBackground || ''}
                  onChange={(color) => setColor('cstm_inputBackground', color)}
                />
                <ColorPicker
                  label="Input border"
                  value={styles?.colors?.cstm_inputBorder || ''}
                  onChange={(color) => setColor('cstm_inputBorder', color)}
                />
              </S.FieldRow>
            </div>
            <ColorPickerPreview
              headerColor={styles?.colors?.cstm_mainHeader}
              backgroundColor={styles?.colors?.cstm_mainBackground}
              panelBackgroundColor={styles?.colors?.cstm_formPanelBackground}
              buttonsColor={styles?.colors?.cstm_CTAs}
              accentsColor={styles?.colors?.cstm_ornaments}
              inputBackgroundColor={styles?.colors?.cstm_inputBackground}
              inputBorderColor={styles?.colors?.cstm_inputBorder}
            />
          </S.ColorsWrapper>
        </StylesFieldset>
        <StylesFieldset label="Font">
          <S.TextExample>
            <S.PangramText newStyles={styles}>
              <em>Heading</em>
              <h2>{PANGRAM}</h2>
              <em>Heading</em>
              <h4>{PANGRAM}</h4>
              <em>Body</em>
              <p>{PANGRAM}</p>
            </S.PangramText>
          </S.TextExample>
          <S.FieldRow>
            <FontFamilyPicker fonts={availableFonts} selectedFonts={styles.font} setSelectedFonts={setSelectedFonts} />
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
        <CircleButton
          onClick={handleSave}
          icon={faSave}
          loading={loading}
          buttonType="neutral"
          data-testid="save-styles-button"
        />
        <CircleButton
          onClick={handleDiscard}
          icon={faTimes}
          loading={loading}
          buttonType="neutral"
          data-testid="discard-styles-button"
        />
        {isUpdate && (
          <CircleButton
            onClick={handleDelete}
            icon={faTrash}
            loading={loading}
            buttonType="caution"
            data-testid="discard-styles-button"
          />
        )}
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

function FontFamilyPicker({ fonts, selectedFonts = {}, setSelectedFonts }) {
  return (
    <S.FieldRow>
      <Select
        label="Heading font"
        items={fonts}
        selectedItem={selectedFonts.heading || ''}
        onSelectedItemChange={({ selectedItem }) => setSelectedFonts('heading', selectedItem)}
        testId="heading-font-select"
        name="heading_font"
        helpText='Choose a font for your "Heading" level text'
        placeholder="Select a font"
        displayAccessor="name"
      />
      <Select
        label="Body font"
        items={fonts}
        selectedItem={selectedFonts.body || ''}
        onSelectedItemChange={({ selectedItem }) => setSelectedFonts('body', selectedItem)}
        testId="body-font-select"
        name="body_font"
        helpText='Choose a font for your "Body" level text'
        placeholder="Select a font"
        displayAccessor="name"
      />
    </S.FieldRow>
  );
}

function getFontSizesFromFontSize(fontSize) {
  if (!fontSize) return;
  const factors = [0.75, 1, 1.5, 2, 3, 5, 6];
  return factors.map((factor) => `${fontSize * factor}px`);
}

function getFontSizeFromFontSizes(fontSizes) {
  if (!fontSizes || fontSizes.length < 2) return;
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
