import tinycolor from 'tinycolor2';
/**
 * Lightens a color by percentage provided, or default of 10%
 */
function lighten(color, percentage = 10) {
  return tinycolor(color).lighten(percentage).toString();
}

export default lighten;
