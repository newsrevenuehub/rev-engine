import * as S from './PageSidebarElements.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import ScrollBox from 'elements/ScrollBox';
import DraggableList from 'elements/draggable/DraggableList';
import { EmptyElements } from '../pageElements/PageElements';

function PageSidebarElements({ openAddElementModal, goToProperties, handleRemoveElement }) {
  const { sidebarElements, setSidebarElements } = useEditInterfaceContext();

  return (
    <S.PageSidebarElements data-testid="page-sidebar">
      {sidebarElements && sidebarElements?.length > 0 ? (
        <ScrollBox>
          <DraggableList
            elements={sidebarElements}
            setElements={setSidebarElements}
            handleItemEdit={(element) => goToProperties(element, 'sidebar')}
            handleItemDelete={(element) => handleRemoveElement(element, 'sidebar')}
          />
        </ScrollBox>
      ) : (
        <EmptyElements />
      )}
      <S.AddElementButton onClick={openAddElementModal} data-testid="add-element-button">
        <S.AddElementIcon icon={faPlus} />
      </S.AddElementButton>
    </S.PageSidebarElements>
  );
}

export default PageSidebarElements;
