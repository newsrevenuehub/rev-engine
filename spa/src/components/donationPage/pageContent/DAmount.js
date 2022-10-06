import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { DAmountStyled, FeesContainer, FreqSubtext, OtherAmount, OtherAmountInput } from './DAmount.styled';

// Util
import validateInputPositiveFloat from 'utilities/validateInputPositiveFloat';
import { getFrequencyAdjective, getFrequencyRate } from 'utilities/parseFrequency';
import { getAmountIndex } from '../amountUtils';

// Context
import { usePage } from '../DonationPage';

// Children
import { PayFeesWidget } from 'components/donationPage/pageContent/DPayment';
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import SelectableButton from 'elements/buttons/SelectableButton';
import FormErrors from 'elements/inputs/FormErrors';

function DAmount({ element, ...props }) {
  const { page, frequency, amount, setAmount, overrideAmount, errors } = usePage();
  const [otherFocused, setOtherFocused] = useState(false);

  const displayPayFeesWidget = useMemo(() => {
    return (page.elements.find((elem) => elem.type === 'DPayment') || {})?.content?.offerPayFees;
  }, [page.elements]);

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
      return options[frequency] || [];
    }
    return [];
  };

  const amountIsPreset = useMemo(() => {
    return getAmountIndex(page, amount, frequency) !== -1;
  }, [page, amount, frequency]);

  const handleAmountChange = (newAmount) => {
    setAmount(newAmount);
  };

  const handleOtherAmountChange = (e) => {
    const { value } = e.target;

    if (value === '') {
      handleAmountChange('');
    }

    if (validateInputPositiveFloat(value)) {
      handleAmountChange(parseFloat(e.target.value));
    }
  };

  const currencySymbol = page?.currency?.symbol;

  return (
    <DElement
      label={`${getFrequencyAdjective(frequency)} amount`}
      description="Select how much you'd like to contribute"
      {...props}
      data-testid="d-amount"
    >
      <DAmountStyled>
        {getAmounts(frequency).map((amnt, i) => {
          const selected = parseFloat(amount) === parseFloat(amnt) && !otherFocused;
          return (
            <SelectableButton
              key={i + amnt}
              selected={selected}
              onClick={() => handleAmountChange(parseFloat(amnt))}
              data-testid={`amount-${amnt}${parseFloat(amount) === parseFloat(amnt) ? '-selected' : ''}`}
            >
              {`${currencySymbol}${amnt}`} <FreqSubtext selected={selected}>{getFrequencyRate(frequency)}</FreqSubtext>
            </SelectableButton>
          );
        })}
        {(element.content?.allowOther || overrideAmount) && (
          <OtherAmount
            data-testid={`amount-other${otherFocused || !amountIsPreset ? '-selected' : ''}`}
            selected={otherFocused || !amountIsPreset}
          >
            <span>{currencySymbol}</span>
            <OtherAmountInput
              value={otherFocused || !amountIsPreset ? amount : ''}
              name="amount"
              onChange={handleOtherAmountChange}
              onFocus={handleOtherSelected}
              onBlur={handleOtherBlurred}
              // We're validating maximum amount on the backend, but let's restrict input
              // to prevent hitting javascript's mathmatical limitations and displaying
              // weird numbers after calculating fees and fixing decimals
              maxLength="9"
            />
            <FreqSubtext data-testid="custom-amount-rate">{getFrequencyRate(frequency)}</FreqSubtext>
          </OtherAmount>
        )}
        {displayPayFeesWidget && (
          <FeesContainer>
            <PayFeesWidget />
          </FeesContainer>
        )}
      </DAmountStyled>
      <FormErrors errors={errors.amount} />
    </DElement>
  );
}

const paymentPropTypes = {
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
DAmount.displayName = 'Contribution amount';
DAmount.description = 'Allows a donor to select an amount to contribute';
DAmount.required = true;
DAmount.unique = true;

export default DAmount;
