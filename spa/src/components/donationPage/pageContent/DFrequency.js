import PropTypes from 'prop-types';
import * as S from './DFrequency.styled';

// Context
import { usePage } from '../DonationPage';

// Util
import { getDefaultAmountForFreq } from '../amountUtils';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import GroupedLabel from 'elements/inputs/GroupedLabel';
import { InputGroup, GroupedWrapper } from 'elements/inputs/inputElements.styled';
import FormErrors from 'elements/inputs/FormErrors';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';

function DFrequency({ element, ...props }) {
  const { page, frequency, setFrequency, setAmount, errors, setOverrideAmount } = usePage();

  const handleFrequencySelected = (e, checked) => {
    const value = e.target.value;
    if (checked) {
      setOverrideAmount(false);
      setAmount(getDefaultAmountForFreq(value, page));
      setFrequency(value);
    }
  };

  return (
    <DElement label="Frequency" {...props} data-testid="d-frequency">
      <InputGroup>
        <GroupedLabel>Choose a contribution type</GroupedLabel>
        <GroupedWrapper>
          {element?.content?.sort(frequencySort).map((freq) => (
            <S.CheckBoxField key={freq.value}>
              <S.Radio
                id={freq.value}
                name="interval"
                value={freq.value}
                checked={frequency === freq.value}
                onChange={handleFrequencySelected}
                data-testid={`frequency-${freq.value}${frequency === freq.value ? '-selected' : ''}`}
              />
              <S.CheckboxLabel htmlFor={freq.value}>{freq.displayName}</S.CheckboxLabel>
            </S.CheckBoxField>
          ))}
        </GroupedWrapper>
        <FormErrors errors={errors.interval} />
      </InputGroup>
    </DElement>
  );
}

DFrequency.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes,
    content: PropTypes.arrayOf(
      PropTypes.shape({ displayName: PropTypes.string.isRequired, value: PropTypes.string.isRequired })
    )
  })
};

DFrequency.type = 'DFrequency';
DFrequency.displayName = 'Contribution Frequency';
DFrequency.description = 'Allow contributors to select a frequency at which to contribute';
DFrequency.required = true;
DFrequency.unique = true;

export default DFrequency;

export function frequencySort(a, b) {
  const sortOrder = [CONTRIBUTION_INTERVALS.ONE_TIME, CONTRIBUTION_INTERVALS.MONTHLY, CONTRIBUTION_INTERVALS.ANNUAL];
  const aVal = a.value;
  const bVal = b.value;

  if (sortOrder.indexOf(aVal) > sortOrder.indexOf(bVal)) {
    return 1;
  } else {
    return -1;
  }
}
