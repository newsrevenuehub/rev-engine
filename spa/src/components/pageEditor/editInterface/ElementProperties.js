import * as S from './ElementProperties.styled';

import { useAlert } from 'react-alert';


// Elements
import getElementEditor, { getElementValidator } from 'components/pageEditor/elementEditors/getElementEditor';
import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';

// Assets
import { faCheck, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import CircleButton from 'elements/buttons/CircleButton';

function ElementProperties() {
  const alert = useAlert();

  const { selectedElement, setSelectedElement, elementContent, elements, setElements } = useEditInterfaceContext();

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
      const elementsCopy = [...elements];
      const thisIndex = elementsCopy.findIndex((el) => el.uuid === selectedElement.uuid);
      elementsCopy[thisIndex].content = elementContent;
      setElements(elementsCopy);
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
        <CircleButton icon={faCheck} type="positive" onClick={handleKeepChanges} />
        <CircleButton icon={faTimes} type="caution" onClick={handleDiscardChanges} />
      </S.Buttons>
    </S.ElementProperties>
  );
}

export default ElementProperties;
