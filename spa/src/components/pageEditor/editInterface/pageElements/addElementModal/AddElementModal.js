import { useState, useEffect } from 'react';

import * as S from './AddElementModal.styled';

// Deps
import { v4 as uuidv4 } from 'uuid';

import Modal from 'elements/modal/Modal';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterfaceContextProvider';
import { useEditablePageContext } from 'hooks/useEditablePage';

// Elements
import * as dynamicLayoutElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import PageItem from 'components/pageEditor/editInterface/pageElements/PageItem';

// Additional default values to put into a newly-created element. TODO in
// DEV-3197: refactor this logic into a hook/utility function.

const defaultContent = {
  // Default reason blocks to ask for a reason at least, and have an empty list
  // of pre-supplied reasons.
  DReason: { askReason: true, reasons: [] }
};

const defaultRequiredFields = {
  DDonorAddress: ['mailing_street', 'mailing_city', 'mailing_state', 'mailing_postal_code', 'mailing_country']
};

function AddElementModal({ addElementModalOpen, setAddElementModalOpen, destination = 'layout' }) {
  const { page } = useEditablePageContext();
  const { elements, setElements, sidebarElements, setSidebarElements } = useEditInterfaceContext();
  const [permittedPageElements, setPermittedPageElements] = useState([]);
  const [permittedSidebarElements, setPermittedSidebarElements] = useState([]);

  useEffect(() => {
    setPermittedPageElements(
      Object.values(dynamicLayoutElements).filter(({ type }) => (page?.plan?.page_elements ?? []).includes(type))
    );
    setPermittedSidebarElements(
      Object.values(dynamicSidebarElements).filter(({ type }) => (page?.plan?.sidebar_elements ?? []).includes(type))
    );
  }, [page?.plan?.page_elements, page?.plan?.sidebar_elements]);

  const buildElement = (element) => {
    const { type } = element;
    return {
      uuid: uuidv4(),
      content: defaultContent[type] ? { ...defaultContent[type] } : undefined,
      ...(defaultRequiredFields[type] && { requiredFields: defaultRequiredFields[type] }),
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
    const dynamicElements = destination === 'sidebar' ? permittedSidebarElements : permittedPageElements;
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
        <S.AddElementModal data-testid="add-page-modal">
          <S.ModalContent>
            <S.AvailableElements>{renderDynamicLayoutElements()}</S.AvailableElements>
          </S.ModalContent>
        </S.AddElementModal>
      )}
    </Modal>
  );
}

export default AddElementModal;
