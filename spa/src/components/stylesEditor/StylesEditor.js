import { useState, useEffect } from 'react';
import { Label } from 'elements/inputs/BaseField.styled';
import * as S from './StylesEditor.styled';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES, LIST_FONTS } from 'ajax/endpoints';

// Assets
import { faSave, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

// Deps
import { GENERIC_ERROR } from 'constants/textConstants';
import { useAlert } from 'react-alert';

// Hooks
import useWebFonts from 'hooks/useWebFonts';
import useUser from 'hooks/useUser';

// Context
import { useConfirmationModalContext } from 'elements/modal/GlobalConfirmationModal';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import Select from 'elements/inputs/Select';
import ButtonBorderPreview from 'components/common/ButtonBorderPreview';
import ColorsEditor from './ColorsEditor';
import { Button } from 'components/base';

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
  const requestSendTestEmail = useRequest();

  useWebFonts(styles.font);

  const setName = (name) => {
    setStyles({ ...styles, name });
  };

  const setColor = (colorName, value) => {
    console.log('setCOlor', colorName, value);
    setStyles({ ...styles, colors: { ...styles.colors, [colorName]: value } });
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

  const handleSendTestEmail = (email_name) => () => {
    requestSendTestEmail(
      {
        method: 'POST',
        url: `send-test-email/`,
        data: {
          email_name,
          revenue_program: styles.revenue_program?.id
        }
      },
      {
        onSuccess: () => alert.info(`Sending test ${email_name} email. Check your inbox.`),
        onFailure: () => alert.error('Error sending test email')
      }
    );
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
          <ColorsEditor colors={styles.colors} errors={errors} onChangeColor={setColor} />
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
          <S.FieldRow $gap>
            <SliderPicker
              label="Border radii"
              value={getBaseFromRadii(styles.radii)}
              onChange={setRadii}
              min={1}
              max={12}
            />
            <ButtonBorderPreview borderRadius={getBaseFromRadii(styles.radii) * 2} />
          </S.FieldRow>
        </StylesFieldset>
        <StylesFieldset label="Test email">
          <div style={{ display: 'flex', gap: '16px' }}>
            <Button onClick={handleSendTestEmail('receipt')}>RECEIPT</Button>
            <Button onClick={handleSendTestEmail('reminder')}>REMINDER</Button>
            <Button onClick={handleSendTestEmail('magic_link')}>MAGIC LINK</Button>
          </div>
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

function SliderPicker({ label, value, onChange, ...props }) {
  return (
    <S.SliderWrapper>
      {label && <Label>{label}</Label>}
      <S.SliderBox>
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
