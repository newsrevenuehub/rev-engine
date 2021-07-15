import * as S from './FrequencyEditor.styled';
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

  return (
    <S.FrequencyEditor data-testid="frequency-editor">
      {FREQUENCIES.map((frequency) => (
        <S.ToggleWrapper key={frequency.value}>
          <S.Toggle
            label={`${frequency.displayName} payments enabled`}
            toggle
            checked={getFrequencyState(frequency.value, elementContent)}
            onChange={(_e, { checked }) => setToggled(checked, frequency.value)}
          />
        </S.ToggleWrapper>
      ))}
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
