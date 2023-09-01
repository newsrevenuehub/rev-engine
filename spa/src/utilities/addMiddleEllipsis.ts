export const MAX_LENGTH = 35;
export const PRE_ELLIPSIS_SIZE = 20;
export const POST_ELLIPSIS_SIZE = 10;

function addMiddleEllipsis(
  str: string,
  maxLength = MAX_LENGTH,
  preEllipsisSize = PRE_ELLIPSIS_SIZE,
  postEllipsisSize = POST_ELLIPSIS_SIZE
) {
  // If the maxLength is greater than the MAX_LENGTH, then the preEllipsisSize and postEllipsisSize are ignored.
  if (maxLength > MAX_LENGTH && maxLength < preEllipsisSize + postEllipsisSize + 1) {
    throw new Error('The "maxLength" should be greater than the "preEllipsisSize + … + postEllipsisSize"');
  }

  if (str.length > maxLength) {
    const preEllipsis = maxLength < MAX_LENGTH ? maxLength / 2 : preEllipsisSize;
    const postEllipsis = maxLength < MAX_LENGTH ? maxLength / 5 : postEllipsisSize;

    return str.substring(0, preEllipsis) + '…' + str.substring(str.length - postEllipsis, str.length);
  }
  return str;
}

export default addMiddleEllipsis;
