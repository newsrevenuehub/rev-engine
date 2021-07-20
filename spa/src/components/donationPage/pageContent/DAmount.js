import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as S from './DAmount.styled';

// Util
import { getFrequencyAdjective, getFrequencyRate } from 'utilities/parseFrequency';

// Context
import { usePage } from '../DonationPage';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import SelectableButton from 'elements/buttons/SelectableButton';
import FormErrors from 'elements/inputs/FormErrors';

function DAmount({ element, ...props }) {
  const { frequency, setAmount, errors } = usePage();

  const [selectedAmount, setSelectedAmount] = useState(0);
  const [otherAmount, setOtherAmount] = useState('');

  const inputRef = useRef();

  const handleAmountSelected = (s) => {
    setSelectedAmount(s);
    // Clear "other amount" if present
    setOtherAmount('');
  };

  const handleOtherSelected = () => {
    setSelectedAmount('other');
    inputRef.current.focus();
  };

  useEffect(() => {
    let amount;
    if (selectedAmount === 'other') {
      amount = parseFloat(otherAmount || 0).toFixed(2);
    } else {
      // It's possible options[frequency][selectedAmount] is undefined, in the case that somebody either
      // has stale development data, or somebody has messed around with page.elements JSONField.
      amount =
        element?.content?.options &&
        element.content?.options[frequency] &&
        element.content?.options[frequency][selectedAmount];
    }
    setAmount(amount);
  }, [selectedAmount, otherAmount, frequency, element?.content?.options, setAmount]);

  return (
    <DElement
      label={`${getFrequencyAdjective(frequency)} amount`}
      description="Select how much you'd like to contribute"
      {...props}
      data-testid="d-amount"
    >
      <S.DAmount>
        {element.content?.options &&
          element.content?.options[frequency] &&
          element.content?.options[frequency].map((amount, i) => (
            <SelectableButton
              key={i + amount}
              selected={selectedAmount === i}
              onClick={() => handleAmountSelected(i)}
              data-testid={`amount-${amount}`}
            >{`$${amount}`}</SelectableButton>
          ))}
        {element.content?.allowOther && (
          <S.OtherAmount selected={selectedAmount === 'other'} onClick={handleOtherSelected}>
            <span>$</span>
            <S.OtherAmountInput
              ref={inputRef}
              type="number"
              value={otherAmount}
              onChange={(e) => setOtherAmount(e.target.value)}
            />
            <span data-testid="custom-amount-rate">{getFrequencyRate(frequency)}</span>
          </S.OtherAmount>
        )}
      </S.DAmount>
      <FormErrors errors={errors.amount} />
    </DElement>
  );
}

const paymentPropTypes = {
  offerPayFees: PropTypes.bool,
  allowOther: PropTypes.bool,
  options: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))).isRequired
};

DAmount.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes,
    content: PropTypes.shape(paymentPropTypes)
  })
};

DAmount.type = 'DAmount';
DAmount.displayName = 'Donation amount';
DAmount.description = 'Allows a donor to select an amount to donate';
DAmount.required = true;
DAmount.unique = true;

export default DAmount;
