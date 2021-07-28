import * as S from './PageSidebarElements.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import DraggableList from 'elements/draggable/DraggableList';
function PageSidebarElements({ openAddElementModal, goToProperties }) {
  const { sidebarElements, setSidebarElements } = useEditInterfaceContext();

  return (
    <S.PageSidebarElements>
      {sidebarElements && (
        <DraggableList elements={sidebarElements} setElements={setSidebarElements} handleItemClick={goToProperties} />
      )}
      <S.AddElementButton onClick={openAddElementModal} data-testid="add-element-button">
        <S.AddElementIcon icon={faPlus} />
      </S.AddElementButton>
    </S.PageSidebarElements>
  );
}

export default PageSidebarElements;
