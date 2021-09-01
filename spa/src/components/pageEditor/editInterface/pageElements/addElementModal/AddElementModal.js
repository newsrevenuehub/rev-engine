import * as S from './AddElementModal.styled';

// Deps
import { v4 as uuidv4 } from 'uuid';

import Modal from 'elements/modal/Modal';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Elements
import * as dynamicLayoutElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import PageItem from 'components/pageEditor/editInterface/pageElements/PageItem';

function AddElementModal({ addElementModalOpen, setAddElementModalOpen, destination = 'layout' }) {
  const { elements, setElements, sidebarElements, setSidebarElements } = useEditInterfaceContext();
  const buildElement = (element) => {
    const { type } = element;
    return {
      uuid: uuidv4(),
      type
    };
  };

  const handleElementSelected = (element) => {
    if (destination === 'sidebar') {
      setSidebarElements([...(sidebarElements || []), buildElement(element)]);
    } else {
      setElements([...(elements || []), buildElement(element)]);
    }
    setAddElementModalOpen(false);
  };

  const renderDynamicLayoutElements = () => {
    const dynamicElements = destination === 'sidebar' ? dynamicSidebarElements : dynamicLayoutElements;
    return Object.keys(dynamicElements).map((elName, i) => {
      const element = dynamicElements[elName];
      const els = destination === 'sidebar' ? sidebarElements : elements;
      // An element is disabled if it's unique and already present.
      const disabled = element.unique && els?.some((el) => el.type === element.type);
      return (
        <S.PageItemWrapper key={element.displayName + i}>
          <PageItem
            disabled={disabled}
            element={element}
            isStatic
            onClick={disabled ? undefined : () => handleElementSelected(element)}
            data-testid={`add-${element.type}`}
          />
        </S.PageItemWrapper>
      );
    });
  };

  return (
    <Modal isOpen={addElementModalOpen} closeModal={() => setAddElementModalOpen(false)}>
      {addElementModalOpen && (
        <S.AddElementModal>
          <S.ModalContent>
            <S.AvailableElements>{renderDynamicLayoutElements()}</S.AvailableElements>
          </S.ModalContent>
        </S.AddElementModal>
      )}
    </Modal>
  );
}

export default AddElementModal;
