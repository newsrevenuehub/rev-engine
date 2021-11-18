import { useState, useRef, useEffect, useCallback } from 'react';

export const findIndex = (i, yOffset, sizes, swapDistance) => {
  let target = i;

  // If moving down
  if (yOffset > 0) {
    const nextHeight = sizes[i + 1];
    if (nextHeight === undefined) return i;

    const swapOffset = swapDistance(nextHeight);
    if (yOffset > swapOffset) target = i + 1;

    // If moving up
  } else if (yOffset < 0) {
    const prevHeight = sizes[i - 1];
    if (prevHeight === undefined) return i;

    const swapOffset = swapDistance(prevHeight);
    if (yOffset < -swapOffset) target = i - 1;
  }

  return Math.min(Math.max(target, 0), sizes.length);
};

export function useDynamicList({ elements, swapDistance, onPositionUpdate, onDragEnd, onPositionChange }) {
  const sizes = useRef(new Array(elements.length).fill(0)).current;
  const [startIndex, handleDragStart] = useState(-1);

  const handleChange = useCallback(
    (i, dragOffset) => {
      const targetIndex = findIndex(i, dragOffset, sizes, swapDistance);
      if (targetIndex !== i) {
        const swapSize = sizes[targetIndex];
        sizes[targetIndex] = sizes[i];
        sizes[i] = swapSize;

        onPositionUpdate(i, targetIndex);
      }
    },
    [sizes, swapDistance, onPositionUpdate]
  );

  const handleDragEnd = useCallback(
    (endIndex) => {
      if (onPositionChange && startIndex !== endIndex) onPositionChange(startIndex, endIndex);
      onDragEnd(startIndex, endIndex);
      handleDragStart(-1);
    },
    [startIndex, onPositionChange, onDragEnd]
  );

  const handleMeasure = useCallback(
    (index, size) => {
      sizes[index] = size;
    },
    [sizes]
  );

  return {
    handleChange,
    handleDragStart,
    handleDragEnd,
    handleMeasure
  };
}

export function useDynamicListItem(index, drag, itemProps) {
  const { handleChange, handleDragStart, handleDragEnd, handleMeasure } = itemProps;
  const [state, setState] = useState('idle');
  const ref = useRef(null);

  useEffect(() => {
    if (ref && ref.current) handleMeasure(index, drag === 'y' ? ref.current.offsetHeight : ref.current.offsetWidth);
  }, [ref, handleMeasure, index, drag]);

  return [
    state,
    ref,
    {
      onDragStart: () => {
        setState('dragging');
        handleDragStart(index);
      },
      onDragEnd: () => {
        setState('animating');
        handleDragEnd(index);
      },
      onAnimationComplete: () => {
        if (state === 'animating') setState('idle');
      },
      onViewportBoxUpdate: (_viewportBox, delta) => {
        if (state === 'dragging') handleChange(index, delta.y.translate);
      }
    }
  ];
}
