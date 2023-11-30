import { useRef } from 'react';
import * as S from './DraggableList.styled';
import { motion, Reorder, useElementScroll } from 'framer-motion';

// Children
import PageItem from 'components/pageEditor/editInterface/pageElements/PageItem';

function DraggableList({ elements, setElements, handleItemEdit, handleItemDelete }) {
  const ref = useRef(null);
  const [handlePan, scroll] = usePanAndScroll(ref);

  return (
    <motion.div ref={ref} onPan={handlePan} layoutScroll>
      <Reorder.Group axis="y" values={elements} onReorder={setElements} style={S.DraggableListStyles}>
        {elements.map((element) => (
          <Reorder.Item
            key={element.uuid}
            value={element}
            style={S.DraggableListItemStyles}
            scroll={scroll}
            {...S.ItemActiveStyles}
          >
            <PageItem
              element={element}
              handleItemEdit={() => handleItemEdit(element)}
              handleItemDelete={() => handleItemDelete(element)}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </motion.div>
  );
}

export default DraggableList;

function usePanAndScroll(ref) {
  const scroll = useElementScroll(ref);
  const handlePan = (_, pointInfo) => {
    if (Math.abs(ref.current.getBoundingClientRect().y - pointInfo.point.y) > 270) {
      ref.current.scroll({ top: scroll.scrollY.get() + 3, left: 0 });
    }
  };

  return [handlePan, scroll];
}
