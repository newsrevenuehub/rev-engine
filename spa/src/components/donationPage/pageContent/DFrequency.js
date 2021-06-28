import PropTypes from 'prop-types';
import * as S from './DFrequency.styled';

// Context
import { usePage } from '../DonationPage';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import FormErrors from 'elements/inputs/FormErrors';

function DFrequency({ element, ...props }) {
  const { frequency, setFrequency, errors } = usePage();

  return (
    <DElement label="Frequency" description="Choose a contribution type" {...props} data-testid="d-frequency">
      <S.DFrequency>
        {element?.content?.sort(frequencySort).map((freq) => (
          <S.Radio
            name="interval"
            key={freq.value}
            label={freq.displayName}
            value={freq.value}
            checked={frequency === freq.value}
            onChange={(_e, { value }) => setFrequency(value)}
            data-testid={`frequency-${freq.value}`}
          />
        ))}
      </S.DFrequency>
      <FormErrors errors={errors.interval} />
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
DFrequency.displayName = 'Donation frequency';
DFrequency.description = 'Allow donors to select a frequency at which to contribute';
DFrequency.required = true;
DFrequency.unique = true;

export default DFrequency;

function frequencySort(a, b) {
  const sortOrder = ['one_time', 'month', 'year'];
  const aVal = a.value;
  const bVal = b.value;

  if (sortOrder.indexOf(aVal) > sortOrder.indexOf(bVal)) {
    return 1;
  } else {
    return -1;
  }
}
