import * as S from './ElementProperties.styled';
import { useTheme } from 'styled-components';

// Elements
import getElementEditor from 'components/pageEditor/elementEditors/getElementEditor';
import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';

// Assets
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import CircleButton from 'elements/buttons/CircleButton';

function ElementProperties() {
  const theme = useTheme();
  const { selectedElement, setSelectedElement, elementContent, elements, setElements } = useEditInterfaceContext();

  const handleKeepChanges = () => {
    const elementsCopy = [...elements];
    const thisIndex = elementsCopy.findIndex((el) => el.uuid === selectedElement.uuid);
    elementsCopy[thisIndex].content = elementContent;
    setElements(elementsCopy);
    setSelectedElement();
  };

  const handleDiscardChanges = () => {
    setSelectedElement();
  };

  return (
    <S.ElementProperties>
      <S.ElementHeading>
        <h5>{dynamicElements[selectedElement.type].displayName}</h5>
      </S.ElementHeading>
      <S.ElementEditor>{getElementEditor(selectedElement.type)}</S.ElementEditor>
      <S.Buttons>
        <CircleButton icon={faCheck} color={theme.colors.success} onClick={handleKeepChanges} />
        <CircleButton icon={faTimes} color={theme.colors.caution} onClick={handleDiscardChanges} />
      </S.Buttons>
    </S.ElementProperties>
  );
}

export default ElementProperties;
