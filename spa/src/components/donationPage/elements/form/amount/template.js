export const args = {
  labelText: 'Monthly amount',
  amountFrequency: 'month',
  amountCurrencySymbol: '$',
  presetAmounts: [100, 200, 300],
  defaultValue: null,
  allowUserSetValue: true,
  helperText: "Select how much you'd like to contribute",
  name: 'amount'
};

export const oneTime = {
  ...args,
  labelText: 'Amount',
  amountFrequency: null,
  name: 'one-time-amount'
};

export const defaultUserSetValue = {
  ...args,
  defaultValue: 12.37,
  name: 'default-set-amount'
};
