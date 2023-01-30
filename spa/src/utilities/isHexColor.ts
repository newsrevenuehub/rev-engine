const validColorRegex = /^#[\da-f]{6}$/i;

/**
 * Returns whether the string is a valid hex color with a `#` at its start. Does
 * not allow shorthands like `#333`.
 */
export function isHexColor(value: string) {
  return validColorRegex.test(value);
}
