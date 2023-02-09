import { ElementContainer, Root } from './PageSidebarElements.styled';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterfaceContextProvider';

// Children
import DraggableList from 'elements/draggable/DraggableList';
import EditTabHeader from '../EditTabHeader';

function PageSidebarElements({ openAddElementModal, goToProperties, handleRemoveElement }) {
  const { sidebarElements, setSidebarElements } = useEditInterfaceContext();

  // layoutScroll prop on ElementContainer is needed so that framer-motion
  // correctly calculates block positions during reordering. Otherwise, you'll
  // see weird overlaps if you drag while the container is scrolled to a
  // non-zero position.

  return (
    <Root data-testid="page-sidebar">
      <EditTabHeader
        addButtonLabel="Add Block"
        onAdd={openAddElementModal}
        prompt="Add, edit, and rearrange sidebar sections."
      />
      {sidebarElements && sidebarElements?.length > 0 && (
        <ElementContainer layoutScroll>
          <DraggableList
            elements={sidebarElements}
            setElements={setSidebarElements}
            handleItemEdit={(element) => goToProperties(element, 'sidebar')}
            handleItemDelete={(element) => handleRemoveElement(element, 'sidebar')}
          />
        </ElementContainer>
      )}
    </Root>
  );
}

export default PageSidebarElements;
