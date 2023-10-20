function formatStringAmountForDisplay(strAmount: string | number, locale?: string) {
  // This is hacky, and accommodating the fact that TypeScript thinks
  // (correctly) you should only pass a string to parseFloat(). But in practice,
  // we are doing this with a number in some cases, and it seems to be harmless
  // when we do.

  return parseFloat(strAmount as string).toLocaleString(locale, { minimumFractionDigits: 2 });
}

export default formatStringAmountForDisplay;
