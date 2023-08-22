export const MAX_LENGTH = 35;

function addMiddleEllipsis(str: string, maxLength = MAX_LENGTH) {
  if (str.length > maxLength) {
    return str.substring(0, 20) + '…' + str.substring(str.length - 10, str.length);
  }
  return str;
}

export default addMiddleEllipsis;
