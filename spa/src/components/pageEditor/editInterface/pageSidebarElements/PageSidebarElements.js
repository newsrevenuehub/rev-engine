import { ElementContainer, Root } from './PageSidebarElements.styled';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import DraggableList from 'elements/draggable/DraggableList';
import EditTabHeader from '../EditTabHeader';

function PageSidebarElements({ openAddElementModal, goToProperties, handleRemoveElement }) {
  const { sidebarElements, setSidebarElements } = useEditInterfaceContext();

  return (
    <Root data-testid="page-sidebar">
      <EditTabHeader
        addButtonLabel="Add Block"
        onAdd={openAddElementModal}
        prompt="Add, edit, and rearrange sidebar sections."
      />
      {sidebarElements && sidebarElements?.length > 0 && (
        <ElementContainer>
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
