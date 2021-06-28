import { useCallback } from 'react';
import * as S from './DraggableList.styled';
import { motion } from 'framer-motion';

// Util
import { moveArray, getDragStateZIndex, calculateSwapDistance } from './drag-utils';
import { useDynamicList, useDynamicListItem } from './dynamic';

// Children
import PageItem from 'components/pageEditor/editInterface/pageElements/PageItem';

const ITEM_FIXED_HEIGHT = 80;

/* A relatively simple implementation of Framer-Motion's Reorderable List Example:
  https://codesandbox.io/s/framer-motion-2-drag-to-reorder-forked-njcdl
*/
function DraggableItem({ index, height, color, itemProps, element, handleItemClick }) {
  const [dragState, ref, eventHandlers] = useDynamicListItem(index, 'y', itemProps);

  return (
    <S.DraggableListItem
      style={{
        padding: 0,
        height,
        margin: '1rem 0',
        // If we're dragging, we want to set the zIndex of that item to be on top of the other items.
        zIndex: getDragStateZIndex(dragState)
      }}
    >
      <motion.div
        layout
        initial={false}
        drag="y"
        ref={ref}
        style={{
          background: color,
          height,
          borderRadius: 5
        }}
        whileHover={{
          scale: 1.03,
          boxShadow: '0px 3px 3px rgba(0,0,0,0.15)'
        }}
        whileTap={{
          scale: 1.1,
          boxShadow: '0px 5px 5px rgba(0,0,0,0.1)'
        }}
        {...eventHandlers}
      >
        <PageItem element={element} dragState={dragState} handleItemClick={handleItemClick} />
      </motion.div>
    </S.DraggableListItem>
  );
}

function DraggableList({ elements, setElements, handleItemClick }) {
  const onPositionUpdate = useCallback(
    (startIndex, endIndex) => {
      setElements(moveArray(elements, startIndex, endIndex));
    },
    [elements, setElements]
  );
  const props = useDynamicList({
    elements,
    swapDistance: calculateSwapDistance,
    onPositionUpdate
  });

  return (
    <S.DraggableList>
      {elements.map((item, i) => (
        <DraggableItem
          key={item.uuid}
          height={item.height || ITEM_FIXED_HEIGHT}
          index={i}
          element={item}
          itemProps={props}
          handleItemClick={handleItemClick}
        />
      ))}
    </S.DraggableList>
  );
}

export default DraggableList;
