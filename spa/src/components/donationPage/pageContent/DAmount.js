import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import * as S from './DAmount.styled';

// Util
import { getFrequencyAdverb, getFrequencyAdjective, getFrequencyRate } from 'utilities/parseFrequency';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
// import { useElements } from 'components/donationPage/DonationPage';
import SelectableButton from 'elements/buttons/SelectableButton';

const frequency = 'month';
function DAmount({ element, ...props }) {
  // const { elements } = useElements();

  const inputRef = useRef();

  const [selectedAmount, setSelectedAmount] = useState(0);
  const [otherAmount, setOtherAmount] = useState('');
  const [payFees, setPayFees] = useState(false);

  const handleAmountSelected = (s) => {
    setSelectedAmount(s);
    // Clear "other amount" if present
    setOtherAmount('');
  };

  const handleOtherSelected = () => {
    setSelectedAmount('other');
    inputRef.current.focus();
  };

  return (
    <DElement
      label={`${getFrequencyAdjective(frequency)} Amount`}
      description="Select how much you'd like to contribute"
      {...props}
    >
      <S.DAmount>
        {element.content.options[frequency].map((amount, i) => (
          <SelectableButton
            key={i + amount}
            selected={selectedAmount === i}
            onClick={() => handleAmountSelected(i)}
          >{`$${amount}`}</SelectableButton>
        ))}
        {element.content.allowOther && (
          <S.OtherAmount selected={selectedAmount === 'other'} onClick={handleOtherSelected}>
            <span>$</span>
            <S.OtherAmountInput
              ref={inputRef}
              type="number"
              value={otherAmount}
              onChange={(e) => setOtherAmount(e.target.value)}
            />
            <span>{getFrequencyRate(frequency)}</span>
          </S.OtherAmount>
        )}
      </S.DAmount>
      {element.content.offerPayFees && (
        <S.PayFees>
          <S.PayFeesQQ>Agree to pay fees?</S.PayFeesQQ>
          <S.Checkbox
            label={`${'$2.99'} ${getFrequencyAdverb(frequency)}`}
            toggle
            checked={payFees}
            // value={payFees}
            onChange={(e, { checked }) => setPayFees(checked)}
          />
          <S.PayFeesDescription>
            Paying the Stripe transaction fee, while not required, directs more money in support of our mission.
          </S.PayFeesDescription>
        </S.PayFees>
      )}
    </DElement>
  );
}

const paymentPropTypes = {
  offerPayFees: PropTypes.bool,
  allowOther: PropTypes.bool,
  options: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.number)).isRequired
};

DAmount.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes,
    content: PropTypes.shape(paymentPropTypes)
  })
};

export default DAmount;
