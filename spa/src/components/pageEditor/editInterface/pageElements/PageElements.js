import * as S from './PageElements.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import DraggableList from 'elements/draggable/DraggableList';
import ScrollBox from 'elements/ScrollBox';

/**
 * PageElements
 * PageElements renders a draggable list of existing re-orderable page elements, as well as
 * a button to open the AddElementModal. Selecting an element in the list swaps this component
 * for ElementProperties
 *
 * PageElements is a direct child of EditInterface.
 */
function PageElements({ openAddElementModal, goToProperties, handleRemoveElement }) {
  const { elements, setElements } = useEditInterfaceContext();

  return (
    <S.PageElements>
      {elements && elements?.length > 0 ? (
        <ScrollBox>
          <DraggableList
            elements={elements}
            setElements={setElements}
            handleItemEdit={(element) => goToProperties(element, 'layout')}
            handleItemDelete={(element) => handleRemoveElement(element, 'layout')}
          />
        </ScrollBox>
      ) : (
        <EmptyElements />
      )}
      <S.AddElementButton onClick={openAddElementModal} data-testid="add-element-button">
        <S.AddElementIcon icon={faPlus} />
      </S.AddElementButton>
    </S.PageElements>
  );
}

export default PageElements;

export function EmptyElements() {
  return <S.EmptyElements>Click the "plus" button below to start adding page elements</S.EmptyElements>;
}
