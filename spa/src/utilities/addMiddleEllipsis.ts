export const MAX_LENGTH = 35;

function addMiddleEllipsis(string: string, maxLength = MAX_LENGTH) {
  if (maxLength < 3) {
    throw new Error('Max length must be at least 3');
  }

  if (string.length <= maxLength) {
    return string;
  }

  // We want to truncate the string to maxLength - 1, to leave room for the
  // ellipsis in the middle.
  const sliceLength = Math.floor((maxLength - 1) / 2);

  // However, if the requested length is even, we need uneven slices--we'll
  // favor the start.
  if (maxLength % 2 === 0) {
    return string.slice(0, sliceLength + 1) + '…' + string.slice(-sliceLength);
  }

  return string.slice(0, sliceLength) + '…' + string.slice(-sliceLength);
}

export default addMiddleEllipsis;
