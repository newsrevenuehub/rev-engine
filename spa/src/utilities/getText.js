/**
 * Returns display text based on text nested in a page element's json definition. Can accept
 * accessors up to two levels deep. Falls back to defaultText if key not found.
 * @param {Object} element - the page element which we expect to have a "text" key
 * @param {string} accessor  - an accessor or a single chained accessor "foo.bar"
 * @param {string} defaultText - Text to use if there is nothing at the provided location
 * @returns {string} - Text to display
 */
function getText(element = {}, accessor = '', defaultText) {
  const s = accessor.split('.');
  const a1 = s[0];

  let val = element?.text[a1];
  if (s.length > 1) {
    return val[s[1]] || defaultText;
  }
  return val || defaultText;
}

export default getText;
