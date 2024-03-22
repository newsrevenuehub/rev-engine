import { useAlert } from 'react-alert';
import getElementEditor, { getElementValidator } from 'components/pageEditor/elementEditors/getElementEditor';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterfaceContextProvider';
import { NoComponentError } from 'components/donationPage/pageGetters';
import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import EditSaveControls from 'components/pageEditor/editInterface/EditSaveControls';
import { DeleteButton, ElementHeading, ElementEditor, Root, TrashIcon } from './ElementProperties.styled';

const dynamicElements = { ...dynamicPageElements, ...dynamicSidebarElements };

/**
 * ElementProperties
 * ElementProperties is a detail view for an individual page element. It is responsible for
 * discovering the appropriate element editor component, the appropriate element validator,
 * and controlling their state.
 *
 * ElementProperties is a direct child of EditInterface
 */
function ElementProperties({ selectedElementType }) {
  const alert = useAlert();
  const {
    selectedElement,
    setSelectedElement,
    elementContent,
    elementRequiredFields,
    elements,
    setElements,
    sidebarElements,
    setSidebarElements,
    handleRemoveElement
  } = useEditInterfaceContext();

  const changesAreValid = () => {
    const getHasErrors = getElementValidator(selectedElement.type);
    if (!getHasErrors) return true;
    const error = getHasErrors(elementContent);
    if (error) {
      alert.error(error);
    } else {
      return true;
    }
  };

  const handleKeepChanges = () => {
    if (changesAreValid()) {
      const isForSidebar = selectedElementType === 'sidebar';
      const elementsCopy = isForSidebar ? [...sidebarElements] : [...elements];
      const thisIndex = elementsCopy.findIndex((el) => el.uuid === selectedElement.uuid);

      elementsCopy[thisIndex].content = elementContent;
      elementsCopy[thisIndex].requiredFields = elementRequiredFields;

      if (isForSidebar) setSidebarElements(elementsCopy);
      else setElements(elementsCopy);
      setSelectedElement();
    }
  };

  const handleDiscardChanges = () => {
    setSelectedElement();
  };

  const handleDeleteElement = () => {
    handleRemoveElement(selectedElement, selectedElementType);
    setSelectedElement();
  };

  if (!dynamicElements[selectedElement.type]) {
    return (
      <>
        <ElementHeading>
          <DeleteButton onClick={handleDeleteElement}>
            <TrashIcon icon={faTrash} />
          </DeleteButton>
        </ElementHeading>
        <NoComponentError name={selectedElement.type} />
      </>
    );
  }

  return (
    <Root data-testid="element-properties">
      <ElementHeading>
        <h5>{dynamicElements[selectedElement.type].displayName}</h5>
        {!dynamicElements[selectedElement.type].required && (
          <DeleteButton onClick={handleDeleteElement}>
            <TrashIcon />
          </DeleteButton>
        )}
      </ElementHeading>
      <ElementEditor>{getElementEditor(selectedElement.type)}</ElementEditor>
      <EditSaveControls onCancel={handleDiscardChanges} onUpdate={handleKeepChanges} variant="cancel" />
    </Root>
  );
}

export default ElementProperties;
