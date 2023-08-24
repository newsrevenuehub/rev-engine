export const MAX_LENGTH = 35;
export const PRE_ELLIPSIS_SIZE = 20;
export const POST_ELLIPSIS_SIZE = 10;

// For this function to work properly, the "maxLength" should be greater than the "preEllipsisSize + … + postEllipsisSize"
function addMiddleEllipsis(
  str: string,
  maxLength = MAX_LENGTH,
  preEllipsisSize = PRE_ELLIPSIS_SIZE,
  postEllipsisSize = POST_ELLIPSIS_SIZE
) {
  if (str.length > maxLength) {
    const preEllipsis = maxLength < MAX_LENGTH ? maxLength / 2 : preEllipsisSize;
    const postEllipsis = maxLength < MAX_LENGTH ? maxLength / 5 : postEllipsisSize;

    return str.substring(0, preEllipsis) + '…' + str.substring(str.length - postEllipsis, str.length);
  }
  return str;
}

export default addMiddleEllipsis;
