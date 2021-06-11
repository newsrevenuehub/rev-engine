import { useState } from 'react';
import PropTypes from 'prop-types';
import * as S from './DFrequency.styled';
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

function DFrequency({ element, ...props }) {
  const [selected, setSelected] = useState('');

  return (
    <DElement label="Frequency" description="Choose a contribution type" {...props}>
      <S.DFrequency>
        {element?.content?.map((freq) => (
          <S.Radio
            key={freq.value}
            label={freq.displayName}
            value={freq.value}
            checked={selected === freq.value}
            onChange={(_e, { value }) => setSelected(value)}
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
