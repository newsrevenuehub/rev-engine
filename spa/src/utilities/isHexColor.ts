const validColorRegex = /^#[\da-f]{6}$/i;

/**
 * Returns whether the string is a valid hex color with a `#` at its start, e.g.
 * suitable for a value of an `<input type="color" />` or ColorPicker component.
 * Does not allow shorthands like `#333` or alpha hex codes like `#1122334455`.
 */
export function isHexColor(value: string) {
  return validColorRegex.test(value);
}
