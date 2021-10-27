import * as S from './FrequencyEditor.styled';
import { useTheme } from 'styled-components';
// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

const FREQUENCIES = [
  { value: 'one_time', displayName: 'One time' },
  { value: 'month', displayName: 'Monthly' },
  { value: 'year', displayName: 'Yearly' }
];

const MINIMUM_FREQUENCIES = 1;
const NOT_ENOUGH_FREQS = `You must have at least ${MINIMUM_FREQUENCIES} frequenc${
  MINIMUM_FREQUENCIES > 1 ? 'ies' : 'y'
} for your page to function properly`;

function FrequencyEditor() {
  const theme = useTheme();
  const { elementContent = [], setElementContent } = useEditInterfaceContext();

  const setToggled = (checked, frequency) => {
    let content = [...elementContent];
    if (checked) {
      const elIndex = content.findIndex((el) => el.value === frequency);
      const ogIndex = FREQUENCIES.findIndex((el) => el.value === frequency);
      if (elIndex === -1) content.push(FREQUENCIES[ogIndex]);
    } else {
      content = content.filter((el) => el.value !== frequency);
    }

    setElementContent(content);
  };

  const makeFreqDefault = (frequency) => {
    const freqs = [...elementContent];
    const freqIsEnabled = freqs.find((f) => f.value === frequency);
    if (freqIsEnabled) setElementContent(freqs.map((f) => ({ ...f, isDefault: f.value === frequency })));
  };

  return (
    <S.FrequencyEditor data-testid="frequency-editor">
      {FREQUENCIES.map((frequency) => {
        const thisFreq = elementContent.find((f) => f.value === frequency.value);
        return (
          <S.FieldSetWrapper>
            <S.ToggleWrapper key={frequency.value}>
              <S.Toggle
                label={`${frequency.displayName} payments enabled`}
                data-testid="frequency-toggle"
                toggle
                checked={getFrequencyState(frequency.value, elementContent)}
                onChange={(_e, { checked }) => setToggled(checked, frequency.value)}
              />
            </S.ToggleWrapper>
            <S.CheckboxWrapper>
              <S.Checkbox
                id={`${frequency.value}-default`}
                data-testid={`frequency-default-${frequency.value}`}
                type="checkbox"
                style={{
                  color: theme.colors.primary
                }}
                checked={!!thisFreq?.isDefault}
                onChange={() => makeFreqDefault(frequency.value)}
              />
              <S.CheckboxLabel htmlFor={`${frequency.value}-default`}>selected by default</S.CheckboxLabel>
            </S.CheckboxWrapper>
          </S.FieldSetWrapper>
        );
      })}
    </S.FrequencyEditor>
  );
}

FrequencyEditor.for = 'DFrequency';

export default FrequencyEditor;

function getFrequencyState(freq, frequencies) {
  return frequencies?.some((el) => el.value === freq);
}

FrequencyEditor.hasErrors = (content) => {
  // Must have at the minimum frequencies
  if (!content || content.length < MINIMUM_FREQUENCIES) {
    return NOT_ENOUGH_FREQS;
  }
  return false;
};
