export const TOO_LONG_ERROR = 'This can be 100 characters at most.';
export const CONTAINS_SEMICOLON_ERROR = 'This cannot include a semicolon (;) character.';
export const CONTAINS_COLON_ERROR = 'This cannot include a colon (:) character.';

/**
 * Replaces all forbidden characters in a swag value with underscores. This is a
 * requirement for swag_choices metadata in a contribution.
 */
export function cleanSwagValue(value: string) {
  return value.replace(/\W/g, '_');
}

/**
 * Validates whether a string value can be used as a swag name or option. The
 * criteria is the same for both. If it's valid, returns undefined. If invalid,
 * it returns an explanation why.
 */
export function validateSwagValue(value: string) {
  if (value.length > 100) {
    return TOO_LONG_ERROR;
  } else if (value.includes(';')) {
    return CONTAINS_SEMICOLON_ERROR;
  } else if (value.includes(':')) {
    return CONTAINS_COLON_ERROR;
  }
}
