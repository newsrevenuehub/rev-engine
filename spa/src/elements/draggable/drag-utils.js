export function moveArray(items, startIndex, endIndex) {
  const clone = [...items];
  clone[endIndex] = items[startIndex];
  clone[startIndex] = items[endIndex];
  return clone;
}

export const calculateSwapDistance = (sibling) => sibling;

export const getDragStateZIndex = (state, base = 0) => {
  switch (state) {
    case 'dragging':
      return base + 3;
    case 'animating':
      return base + 2;
    default:
      return base + 1;
  }
};
