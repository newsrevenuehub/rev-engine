import * as S from './AddElementModal.styled';

// Deps
import { v4 as uuidv4 } from 'uuid';

import Modal from 'elements/modal/Modal';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Elements
import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';
import PageItem from '../PageItem';

function AddElementModal({ addElementModalOpen, setAddElementModalOpen }) {
  const { elements, setElements } = useEditInterfaceContext();
  const buildElement = (element) => {
    const { type } = element;
    return {
      uuid: uuidv4(),
      type
    };
  };

  const handleElementSelected = (element) => {
    setElements([buildElement(element), ...elements]);
    setAddElementModalOpen(false);
  };

  return (
    <Modal isOpen={addElementModalOpen} closeModal={() => setAddElementModalOpen(false)}>
      {addElementModalOpen && (
        <S.AddElementModal>
          <S.ModalContent>
            <S.AvailableElements>
              {Object.keys(dynamicElements).map((elName, i) => {
                const element = dynamicElements[elName];
                // An element is disabled if it's unique and already present.
                const disabled = element.unique && elements.some((el) => el.type === element.type);
                return (
                  <S.PageItemWrapper>
                    <PageItem
                      disabled={disabled}
                      key={element.displayName + i}
                      element={element}
                      isStatic
                      onClick={disabled ? undefined : () => handleElementSelected(element)}
                    />
                  </S.PageItemWrapper>
                );
              })}
            </S.AvailableElements>
          </S.ModalContent>
        </S.AddElementModal>
      )}
    </Modal>
  );
}

export default AddElementModal;
