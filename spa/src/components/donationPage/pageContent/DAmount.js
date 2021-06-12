import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as S from './DAmount.styled';

// Util
import { getFrequencyAdverb, getFrequencyAdjective, getFrequencyRate } from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

// Context
import { usePage } from '../DonationPage';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import SelectableButton from 'elements/buttons/SelectableButton';

function DAmount({ element, ...props }) {
  const { frequency, fee, setFee, payFee, setPayFee, setAmount } = usePage();

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

  // const getAmountFromIndex = useCallback(() => {
  //   if (selectedAmount === 'other') {
  //     return parseInt(otherAmount);
  //   }

  //   const amount = element.content.options[frequency][selectedAmount];
  //   return parseInt(amount);
  // }, [frequency, selectedAmount, otherAmount, element.content.options]);

  useEffect(() => {
    let amount;
    if (selectedAmount === 'other') {
      amount = parseInt(otherAmount);
    } else {
      amount = element.content.options[frequency][selectedAmount];
    }
    const fee = calculateStripeFee(amount);
    setAmount(amount);
    setFee(fee);
  }, [selectedAmount, otherAmount, frequency, element.content.options, setAmount, setFee]);

  return (
    <DElement
      label={`${getFrequencyAdjective(frequency)} Amount`}
      description="Select how much you'd like to contribute"
      {...props}
      data-testid="d-amount"
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
            <span data-testid="custom-amount-rate">{getFrequencyRate(frequency)}</span>
          </S.OtherAmount>
        )}
      </S.DAmount>
      {element.content.offerPayFees && (
        <S.PayFees data-testid="pay-fees">
          <S.PayFeesQQ>Agree to pay fees?</S.PayFeesQQ>
          <S.Checkbox
            label={fee ? `$${fee} ${getFrequencyAdverb(frequency)}` : ''}
            toggle
            checked={payFee}
            onChange={(_e, { checked }) => setPayFee(checked)}
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
