import * as S from './PageElements.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import DraggableList from 'elements/draggable/DraggableList';

/**
 * PageElements
 * PageElements renders a draggable list of existing re-orderable page elements, as well as
 * a button to open the AddElementModal. Selecting an element in the list swaps this component
 * for ElementProperties
 *
 * PageElements is a direct child of EditInterface.
 */
function PageElements({ openAddElementModal, goToProperties }) {
  const { elements, setElements } = useEditInterfaceContext();
  if (!elements) return null;

  return (
    <S.PageElements>
      <DraggableList elements={elements} setElements={setElements} handleItemClick={goToProperties} />
      <S.AddElementButton onClick={openAddElementModal} data-testid="add-element-button">
        <S.AddElementIcon icon={faPlus} />
      </S.AddElementButton>
    </S.PageElements>
  );
}

export default PageElements;
