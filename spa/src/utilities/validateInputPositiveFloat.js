function validateInputPositiveFloat(string, fixed = 2) {
  const regex = new RegExp('^\\s*(?=.*[0-9])\\d*(?:\\.\\d{1,' + fixed + '})?\\s*$');
  const hasTooManyDecimals = string.split('.').length > 2;
  return regex.test(string) || string === '' || (!hasTooManyDecimals && string[string.length - 1] === '.');
}

export default validateInputPositiveFloat;
