function formatStringAmountForDisplay(strAmount) {
  return parseFloat(strAmount).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default formatStringAmountForDisplay;
