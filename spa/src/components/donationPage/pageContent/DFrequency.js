import PropTypes from 'prop-types';
import * as S from './DFrequency.styled';

// Context
import { usePage } from '../DonationPage';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

function DFrequency({ element, ...props }) {
  const { frequency, setFrequency } = usePage();

  return (
    <DElement label="Frequency" description="Choose a contribution type" {...props} data-testid="d-frequency">
      <S.DFrequency>
        {element?.content?.map((freq) => (
          <S.Radio
            key={freq.value}
            label={freq.displayName}
            value={freq.value}
            checked={frequency === freq.value}
            onChange={(_e, { value }) => setFrequency(value)}
          />
        ))}
      </S.DFrequency>
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

export default DFrequency;
