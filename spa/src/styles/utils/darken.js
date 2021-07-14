import tinycolor from 'tinycolor2';
/**
 * Darkens a color by percentage provided, or default of 10%
 */
function darken(color, percentage = 10) {
  return tinycolor(color).darken(percentage).toString();
}

export default darken;
