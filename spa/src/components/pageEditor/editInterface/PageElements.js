import * as S from './PageElements.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import DraggableList from 'elements/draggable/DraggableList';

function PageElements({ openAddElementModal, goToProperties }) {
  const { elements, setElements } = useEditInterfaceContext();
  if (!elements) return null;

  return (
    <S.PageElements>
      <DraggableList elements={elements} setElements={setElements} handleItemClick={goToProperties} />
      <S.AddElementButton onClick={openAddElementModal}>
        <S.AddElementIcon icon={faPlus} />
      </S.AddElementButton>
    </S.PageElements>
  );
}

export default PageElements;
