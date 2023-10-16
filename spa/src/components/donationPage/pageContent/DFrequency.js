import PropTypes from 'prop-types';
import { CheckBoxField, Radio, CheckboxLabel } from './DFrequency.styled';
import i18n from 'i18n';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
    <DElement label={t('donationPage.dFrequency.frequency')} {...props} data-testid="d-frequency">
      <InputGroup>
        <GroupedLabel>{t('donationPage.dFrequency.chooseContributionType')}</GroupedLabel>
        <GroupedWrapper>
          {element?.content?.sort(frequencySort).map((freq) => (
            <CheckBoxField key={freq.value}>
              <Radio
                id={freq.value}
                name="interval"
                value={freq.value}
                checked={frequency === freq.value}
                onChange={handleFrequencySelected}
                data-testid={`frequency-${freq.value}${frequency === freq.value ? '-selected' : ''}`}
              />
              <CheckboxLabel htmlFor={freq.value}>{t(`common.frequency.adjectives.${freq.value}`)}</CheckboxLabel>
            </CheckBoxField>
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
DFrequency.displayName = i18n.t('donationPage.dFrequency.contributionFrequency');
DFrequency.description = i18n.t('donationPage.dFrequency.allowContributorsToSelectFrequency');
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
