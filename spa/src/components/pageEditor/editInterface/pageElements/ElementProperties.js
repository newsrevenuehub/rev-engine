import * as S from './ElementProperties.styled';

import { useAlert } from 'react-alert';

// Elements
import getElementEditor, { getElementValidator } from 'components/pageEditor/elementEditors/getElementEditor';

// Assets
import { faCheck, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import CircleButton from 'elements/buttons/CircleButton';

import * as dynamicPageElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';

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
    elements,
    setElements,
    sidebarElements,
    setSidebarElements
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

  // ! WIP
  // ? how to ensure handleKeepChaneges "knows" which set of elements to manipulate here...?
  const handleKeepChanges = () => {
    if (changesAreValid()) {
      const isForSidebar = selectedElementType === 'sidebar';
      const elementsCopy = isForSidebar ? [...sidebarElements] : [...elements];
      const thisIndex = elementsCopy.findIndex((el) => el.uuid === selectedElement.uuid);
      console.log('elementsCopy', elementsCopy);

      elementsCopy[thisIndex].content = elementContent;

      if (isForSidebar) setSidebarElements(elementsCopy);
      else setElements(elementsCopy);
      setSelectedElement();
    }
  };

  const handleDiscardChanges = () => {
    setSelectedElement();
  };

  const handleDeleteElement = () => {
    if (!dynamicElements[selectedElement.type].required) {
      const elementsCopy = [...elements];
      const elementsWithout = elementsCopy.filter((el) => el.uuid !== selectedElement.uuid);
      setElements(elementsWithout);
      setSelectedElement();
    }
  };

  return (
    <S.ElementProperties data-testid="element-properties">
      <S.ElementHeading>
        <h5>{dynamicElements[selectedElement.type].displayName}</h5>
        {!dynamicElements[selectedElement.type].required && (
          <S.DeleteButton onClick={handleDeleteElement}>
            <S.TrashIcon icon={faTrash} />
          </S.DeleteButton>
        )}
      </S.ElementHeading>
      <S.ElementEditor>{getElementEditor(selectedElement.type)}</S.ElementEditor>
      <S.Buttons>
        <CircleButton
          icon={faCheck}
          type="positive"
          onClick={handleKeepChanges}
          data-testid="keep-element-changes-button"
        />
        <CircleButton
          icon={faTimes}
          type="caution"
          onClick={handleDiscardChanges}
          data-testid="discard-element-changes-button"
        />
      </S.Buttons>
    </S.ElementProperties>
  );
}

export default ElementProperties;
