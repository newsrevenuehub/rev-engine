function toTitleCase(str) {
  return str
    .split(' ')
    .map((word) => capitalizeFirstLetter(word))
    .join(' ');
}

export default toTitleCase;

function capitalizeFirstLetter(str) {
  if (!str) return str;
  const firstLetter = str[0].toUpperCase();
  return firstLetter + str.slice(1);
}
