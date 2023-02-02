import { ElementContainer, Root } from './PageElements.styled';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterfaceContextProvider';

// Children
import DraggableList from 'elements/draggable/DraggableList';
import EditTabHeader from '../EditTabHeader';

/**
 * PageElements
 * PageElements renders a draggable list of existing re-orderable page elements, as well as
 * a button to open the AddElementModal. Selecting an element in the list swaps this component
 * for ElementProperties
 *
 * PageElements is a direct child of EditInterface.
 */
function PageElements({ openAddElementModal, goToProperties, handleRemoveElement }) {
  const { elements, setElements } = useEditInterfaceContext();

  // layoutScroll prop on ElementContainer is needed so that framer-motion
  // correctly calculates block positions during reordering. Otherwise, you'll
  // see weird overlaps if you drag while the container is scrolled to a
  // non-zero position.

  return (
    <Root>
      <EditTabHeader
        addButtonLabel="Add Block"
        onAdd={openAddElementModal}
        prompt="Add, edit, and rearrange page sections."
      />
      {elements && elements?.length > 0 && (
        <ElementContainer layoutScroll>
          <DraggableList
            elements={elements}
            setElements={setElements}
            handleItemEdit={(element) => goToProperties(element, 'layout')}
            handleItemDelete={(element) => handleRemoveElement(element, 'layout')}
          />
        </ElementContainer>
      )}
    </Root>
  );
}

export default PageElements;
