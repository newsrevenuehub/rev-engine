import React, { useState, useMemo, useEffect } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import { DAmountStyled, FeesContainer, FreqSubtext, OtherAmount, OtherAmountInput } from './DAmount.styled';

// Util
import validateInputPositiveFloat from 'utilities/validateInputPositiveFloat';
import { getFrequencyRate } from 'utilities/parseFrequency';

// Context
import { usePage } from '../DonationPage';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';
import SelectableButton from 'elements/buttons/SelectableButton';
import usePreviousState from 'hooks/usePreviousState';
import FormErrors from 'elements/inputs/FormErrors';
import PayFeesControl from './PayFeesControl';
import { useTranslation } from 'react-i18next';

export type DAmountProps = InferProps<typeof DAmountPropTypes>;

function DAmount({ element, ...props }: DAmountProps) {
  const {
    page,
    feeAmount,
    frequency,
    amount,
    overrideAmount,
    setAmount,
    setUserAgreesToPayFees,
    errors,
    userAgreesToPayFees
  } = usePage();
  const { t } = useTranslation();
  const prevFrequency = usePreviousState(frequency);
  const currencyCode = page?.currency?.code;
  const currencySymbol = page?.currency?.symbol;
  // Corresponds to the value the user has typed into the 'other value' field.
  // It may not contain a valid number.
  const [otherValue, setOtherValue] = useState('');

  // If the page overrides the amount, force the other input value to that. This
  // should only happen during initial rendering in practice, but there is an
  // initial render where overrideAmount is false that we need to account for.

  useEffect(() => {
    if (overrideAmount) {
      setOtherValue(`${amount}`);
    }
  }, [amount, overrideAmount]);

  // If frequency changes, reset otherAmount
  useEffect(() => {
    if (frequency !== prevFrequency && prevFrequency !== undefined && !overrideAmount) {
      setOtherValue('');
    }
  }, [frequency, overrideAmount, prevFrequency]);

  // Display the fees control here if a DPayment element elsewhere asks for it.

  const displayPayFeesControl = useMemo(() => {
    if (!page.elements) {
      return false;
    }

    const paymentElement = page.elements.find(({ type }) => type === 'DPayment');

    if (!paymentElement) {
      return false;
    }

    return (paymentElement.content as { offerPayFees?: boolean }).offerPayFees;
  }, [page.elements]);

  // Find amount options for the page's frequency, and whether any should be
  // selected based on the payment amount.

  const amountOptions = useMemo(() => element?.content?.options?.[frequency] ?? [], [element?.content, frequency]);

  const selectedAmountOption = useMemo(() => {
    // If the user has entered an amount in the other field, never select an
    // option, even if it matches the value they've entered.

    if (otherValue !== '') {
      return -1;
    }

    return amountOptions.findIndex((option) => parseFloat(`${option}`) === amount);
  }, [amountOptions, otherValue, amount]);

  // Called when the user chooses a preselected option.

  const handleSelectAmountOption = (newAmount?: number) => {
    setOtherValue('');
    setAmount(newAmount);
  };

  // Called when the user types into the text field.

  const handleOtherAmountChange = ({
    target: { value }
  }: React.ChangeEvent<HTMLInputElement> | { target: { value: string } }) => {
    setOtherValue(value);

    if (value === '') {
      setAmount(undefined);
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
      data-testid="d-amount"
      label={t(`donationPage.dAmount.label.${frequency}`)}
      description={t('donationPage.dAmount.selectContribution')}
      {...props}
    >
      <DAmountStyled data-testid="d-amount-amounts">
        {amountOptions.map((amountOption, index) => {
          const selected = index === selectedAmountOption;

          return (
            <li key={`${index}-${amountOption}`}>
              <SelectableButton
                selected={selected}
                onClick={() => handleSelectAmountOption(parseFloat(`${amountOption}`))}
                data-testid={`amount-${amountOption}${selected ? '-selected' : ''}`}
              >
                {`${currencySymbol}${amountOption} ${currencyCode}`}{' '}
                <FreqSubtext selected={selected}>{getFrequencyRate(frequency)}</FreqSubtext>
              </SelectableButton>
            </li>
          );
        })}
        {(element?.content?.allowOther || overrideAmount) && (
          <OtherAmount data-testid={`amount-other${otherIsSelected ? '-selected' : ''}`} selected={otherIsSelected}>
            <span>{currencySymbol}</span>
            <OtherAmountInput
              type="number"
              min="0"
              value={otherValue}
              name="amount"
              onChange={handleOtherAmountChange}
              onFocus={handleOtherAmountFocus}
              // We're validating maximum amount on the backend, but let's restrict input
              // to prevent hitting javascript's mathematical limitations and displaying
              // weird numbers after calculating fees and fixing decimals
              maxLength={9}
            />
            <FreqSubtext data-testid="custom-amount-rate">{getFrequencyRate(frequency)}</FreqSubtext>
          </OtherAmount>
        )}
        {displayPayFeesControl && (
          <FeesContainer>
            <PayFeesControl
              agreedToPayFees={userAgreesToPayFees}
              currencyCode={page.currency!.code}
              currencySymbol={page.currency!.symbol}
              locale={page.locale}
              feeAmount={feeAmount}
              frequency={frequency}
              onChange={(event) =>
                setUserAgreesToPayFees((event as React.ChangeEvent<HTMLInputElement>).target.checked)
              }
              revenueProgramName={page.revenue_program.name}
            />
          </FeesContainer>
        )}
      </DAmountStyled>
      <FormErrors errors={errors.amount} />
    </DElement>
  );
}

const paymentPropTypes = {
  allowOther: PropTypes.bool,
  options: PropTypes.objectOf(
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired).isRequired
  ),
  defaults: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))
};

const DAmountPropTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes,
    content: PropTypes.shape(paymentPropTypes)
  })
};

DAmount.propTypes = DAmountPropTypes;

DAmount.type = 'DAmount';
DAmount.displayName = 'Contribution Amount';
DAmount.description = 'Allows a contributor to select an amount to contribute';
DAmount.required = true;
DAmount.unique = true;

export default DAmount;
