import { useState, useMemo } from 'react';
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
  const { page, frequency, amount, setAmount, overrideAmount, errors } = usePage();
  const [otherFocused, setOtherFocused] = useState(false);

  const handleAmountSelected = (a) => {
    setAmount(a);
  };

  const handleOtherSelected = () => {
    setAmount('');
    setOtherFocused(true);
  };

  const handleOtherBlurred = () => {
    setOtherFocused(false);
  };

  const getAmounts = (frequency) => {
    const options = element?.content?.options;
    if (typeof options !== 'undefined') {
      const amounts = options[frequency] || [];
      return overrideAmount ? [] : amounts;
    }
    return [];
  };

  const amountIsPreset = useMemo(() => {
    return getAmountIndex(page, amount, frequency) !== -1;
  }, [page, amount, frequency]);

  return (
    <DElement
      label={`${getFrequencyAdjective(frequency)} amount`}
      description="Select how much you'd like to contribute"
      {...props}
      data-testid="d-amount"
    >
      <S.DAmount>
        {getAmounts(frequency).map((amnt, i) => {
          return (
            <SelectableButton
              key={i + amnt}
              selected={parseFloat(amount) === parseFloat(amnt) && !otherFocused}
              onClick={() => handleAmountSelected(parseFloat(amnt))}
              data-testid={`amount-${amnt}${parseFloat(amount) === parseFloat(amnt) ? '-selected' : ''}`}
            >{`$${amnt}`}</SelectableButton>
          );
        })}
        {(element.content?.allowOther || overrideAmount) && (
          <S.OtherAmount
            data-testid={`amount-other${otherFocused || !amountIsPreset ? '-selected' : ''}`}
            selected={otherFocused}
          >
            <span>$</span>
            <S.OtherAmountInput
              type="number"
              value={otherFocused || !amountIsPreset ? amount : ''}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={handleOtherSelected}
              onBlur={handleOtherBlurred}
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
  options: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))).isRequired,
  defaults: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))
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

export function getAmountIndex(page, amount, frequency) {
  const amountElement = page?.elements?.find((el) => el.type === 'DAmount');
  const amounts = amountElement?.content?.options;
  const amountsForFreq = amounts && amounts[frequency]?.map((amnt) => parseFloat(amnt));

  if (amountsForFreq) {
    return amounts[frequency]?.findIndex((num) => parseFloat(num) === parseFloat(amount));
  }
}

/**
 * getDefaultAmount
 * @param {string} frequency - The frequency to get the default for
 * @param {object} page -
 */
export function getDefaultAmount(frequency, page) {
  const amountElement = page?.elements?.find((el) => el.type === 'DAmount');
  const amounts = amountElement?.content?.options;
  const amountsForFreq = amounts ? amounts[frequency]?.map((amnt) => parseFloat(amnt)) : {};
  const defaults = amountElement?.content?.defaults;

  // If defaults are defined, and a default is defined for this frequency, and the default defined is a valid amount...
  if (defaults && defaults[frequency] && amountsForFreq?.includes(parseFloat(defaults[frequency]))) {
    // ... return the default amount for this frequency.
    return defaults[frequency];
  }
  // Otherwise we have any amounts for this frequency...
  else if (amountsForFreq) {
    // ... return the first frequency in the list.
    return amountsForFreq[0];
  }
}
