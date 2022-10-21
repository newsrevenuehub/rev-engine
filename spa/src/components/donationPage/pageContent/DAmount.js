import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DAmountStyled, FeesContainer, FreqSubtext, OtherAmount, OtherAmountInput } from './DAmount.styled';

// Util
import validateInputPositiveFloat from 'utilities/validateInputPositiveFloat';
import { getFrequencyAdjective, getFrequencyRate } from 'utilities/parseFrequency';

// Context
import { usePage } from '../DonationPage';

// Children
import { PayFeesWidget } from 'components/donationPage/pageContent/DPayment';
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import SelectableButton from 'elements/buttons/SelectableButton';
import FormErrors from 'elements/inputs/FormErrors';

function DAmount({ element, ...props }) {
  const { page, frequency, amount, overrideAmount, setAmount, errors } = usePage();
  const currencySymbol = page?.currency?.symbol;
  const parsedAmount = parseFloat(amount);

  // Corresponds to the value the user has typed into the 'other value' field.
  // It may not contain a valid number.

  const [otherValue, setOtherValue] = useState('');

  // If the page overrides the amount, force the other input value to that. This
  // should only happen during initial rendering in practice, but there is an
  // initial render where overrideAmount is false that we need to account for.

  useEffect(() => {
    if (overrideAmount) {
      setOtherValue(amount);
    }
  }, [amount, overrideAmount]);

  // Display the fees widget here if a DPayment element elsewhere asks for it.

  const displayPayFeesWidget = useMemo(() => {
    return (page.elements.find(({ type }) => type === 'DPayment') ?? {})?.content?.offerPayFees;
  }, [page.elements]);

  // Find amount options for the page's frequency, and whether any should be
  // selected based on the payment amount.

  const amountOptions = useMemo(() => {
    const { options } = element?.content;

    return options?.[frequency] ?? [];
  }, [element?.content, frequency]);

  const selectedAmountOption = useMemo(() => {
    // If the user has entered an amount in the other field, never select an
    // option, even if it matches the value they've entered.

    if (otherValue !== '') {
      return -1;
    }

    return amountOptions.findIndex((option) => parseFloat(option) === parsedAmount);
  }, [amountOptions, otherValue, parsedAmount]);

  // Called when the user chooses a preselected option.

  const handleSelectAmountOption = (newAmount) => {
    setOtherValue('');
    setAmount(newAmount);
  };

  // Called when the user types into the text field.

  const handleOtherAmountChange = ({ target: { value } }) => {
    setOtherValue(value);

    if (value === '') {
      setAmount('');
    }

    if (validateInputPositiveFloat(value)) {
      setAmount(parseFloat(value));
    }
  };

  // Called when the user focuses the text field. We want it to act as though
  // the user has set the amount to whatever's visible there.

  const handleOtherAmountFocus = () => {
    handleOtherAmountChange({ target: { value: otherValue } });
  };

  const otherIsSelected = otherValue !== '' || selectedAmountOption === -1;

  return (
    <DElement
      label={`${getFrequencyAdjective(frequency)} amount`}
      description="Select how much you'd like to contribute"
      {...props}
      data-testid="d-amount"
    >
      <DAmountStyled data-testid="d-amount-amounts">
        {amountOptions.map((amountOption, index) => {
          const selected = index === selectedAmountOption;

          return (
            <SelectableButton
              key={index + amountOption}
              selected={selected}
              onClick={() => handleSelectAmountOption(parseFloat(amountOption))}
              data-testid={`amount-${amountOption}${selected ? '-selected' : ''}`}
            >
              {`${currencySymbol}${amountOption}`}{' '}
              <FreqSubtext selected={selected}>{getFrequencyRate(frequency)}</FreqSubtext>
            </SelectableButton>
          );
        })}
        {(element.content?.allowOther || overrideAmount) && (
          <OtherAmount data-testid={`amount-other${otherIsSelected ? '-selected' : ''}`} selected={otherIsSelected}>
            <span>{currencySymbol}</span>
            <OtherAmountInput
              value={otherValue}
              name="amount"
              onChange={handleOtherAmountChange}
              onFocus={handleOtherAmountFocus}
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
DAmount.displayName = 'Contribution Amount';
DAmount.description = 'Allows a donor to select an amount to contribute';
DAmount.required = true;
DAmount.unique = true;

export default DAmount;
