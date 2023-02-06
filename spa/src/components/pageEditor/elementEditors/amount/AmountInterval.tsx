import { Add } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { ContributionInterval } from 'constants/contributionIntervals';
import { Header, Items, OtherAmountButton, OtherAmountContainer, OtherAmountField } from './AmountInterval.styled';
import AmountItem from './AmountItem';
import validateInputPositiveFloat from 'utilities/validateInputPositiveFloat';

const AmountIntervalPropTypes = {
  defaultOption: PropTypes.number,
  interval: PropTypes.string.isRequired,
  onAddAmount: PropTypes.func.isRequired,
  onRemoveAmount: PropTypes.func.isRequired,
  onSetDefaultAmount: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired
};

/**
 * Exported for tests only.
 */
export const intervalHeaders: Record<ContributionInterval, string> = {
  one_time: 'One Time Contribution',
  month: 'Monthly Contributions',
  year: 'Yearly Contributions'
};

export interface AmountIntervalProps extends InferProps<typeof AmountIntervalPropTypes> {
  interval: ContributionInterval;
  onAddAmount: (value: number) => void;
  onRemoveAmount: (value: number) => void;
  onSetDefaultAmount: (value: number) => void;
}

export function AmountInterval({
  defaultOption,
  interval,
  onAddAmount,
  onRemoveAmount,
  onSetDefaultAmount,
  options
}: AmountIntervalProps) {
  const [newAmount, setNewAmount] = useState('');
  const newAmountInvalidMessage = useMemo(() => {
    // An empty string won't show a validation error.

    if (newAmount === '') {
      return;
    }

    if (!validateInputPositiveFloat(newAmount, 2)) {
      return 'Please enter a positive number with at most two decimal places.';
    }

    if (options.includes(parseFloat(newAmount))) {
      return 'This amount has already been added.';
    }
  }, [newAmount, options]);

  function handleNewAmountChange(event: ChangeEvent<HTMLInputElement>) {
    setNewAmount(event.target.value);
  }

  function handleNewAmountSubmit(event: FormEvent) {
    event.preventDefault();

    const value = parseFloat(newAmount);

    // Catch either invalid amounts or empty strings.

    if (newAmountInvalidMessage || isNaN(value)) {
      return;
    }

    onAddAmount(value);
    setNewAmount('');
  }

  return (
    <div data-testid={`amount-interval-${interval}`}>
      <Header>{intervalHeaders[interval]}</Header>
      <Items>
        {options.map((option) => (
          <AmountItem
            amount={option}
            key={option}
            isDefault={option === defaultOption}
            onSetDefault={() => onSetDefaultAmount(option)}
            onRemove={() => onRemoveAmount(option)}
            removable={options.length > 1}
          />
        ))}
      </Items>
      <OtherAmountContainer data-testid="other-amount-form" onSubmit={handleNewAmountSubmit}>
        <OtherAmountField
          error={!!newAmountInvalidMessage}
          helperText={newAmountInvalidMessage}
          id={`amount-interval-${interval}-other-amount`}
          label="Other amount"
          InputProps={{
            // Have to copy props from our base component to get styling to look correct.
            classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
            endAdornment: (
              <OtherAmountButton aria-label="Add" disabled={!!newAmountInvalidMessage} type="submit">
                <Add />
              </OtherAmountButton>
            )
          }}
          onChange={handleNewAmountChange}
          placeholder="Other amount"
          type="number"
          value={newAmount}
        />
      </OtherAmountContainer>
    </div>
  );
}

AmountInterval.propTypes = AmountIntervalPropTypes;
export default AmountInterval;
