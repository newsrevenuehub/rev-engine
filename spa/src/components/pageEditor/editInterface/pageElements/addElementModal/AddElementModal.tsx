import { useState, useEffect } from 'react';
import PropTypes, { InferProps } from 'prop-types';
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
import { ContributionPageElement, PageElementType } from 'hooks/useContributionPage';

// Additional default values to put into a newly-created element. TODO in
// DEV-3197: refactor this logic into a hook/utility function.

export const defaultContent: Partial<Record<PageElementType, unknown>> = {
  // Default reason blocks to ask for a reason at least, and have an empty list
  // of pre-supplied reasons.
  DReason: { askReason: true, reasons: [] }
};

export const defaultRequiredFields: Partial<Record<PageElementType, string[]>> = {
  DDonorAddress: ['mailing_street', 'mailing_city', 'mailing_state', 'mailing_postal_code', 'mailing_country']
};

type EditContributionPageElement = Omit<ContributionPageElement, 'content' | 'uuid' | 'requiredFields'>;
// Excludes element blocks that are not supported in the specific editor modal type.
type ElementRecord = Record<Exclude<PageElementType, 'DBenefits' | 'DImage'>, EditContributionPageElement>;
type SidebarElementRecord = Record<
  Exclude<
    PageElementType,
    'DAmount' | 'DDonorAddress' | 'DDonorInfo' | 'DFrequency' | 'DPayment' | 'DReason' | 'DRichText' | 'DSwag'
  >,
  EditContributionPageElement
>;

export type AddElementModalProp = InferProps<typeof AddElementModalPropTypes>;

function AddElementModal({ addElementModalOpen, setAddElementModalOpen, destination = 'layout' }: AddElementModalProp) {
  const { page } = useEditablePageContext();
  const { elements, setElements, sidebarElements, setSidebarElements } = useEditInterfaceContext();
  const [permittedPageElements, setPermittedPageElements] = useState<EditContributionPageElement[]>([]);
  const [permittedSidebarElements, setPermittedSidebarElements] = useState<EditContributionPageElement[]>([]);

  // Temp disabling DSwag elements in DEV-3733
  // TODO: Re-enable in DEV-3735
  // useEffect(() => {
  //   setPermittedPageElements(
  //     Object.values(dynamicLayoutElements as ElementRecord).filter(({ type }) =>
  //       (page?.plan?.page_elements ?? []).includes(type)
  //     )
  //   );
  //   setPermittedSidebarElements(
  //     Object.values({ ...dynamicSidebarElements } as SidebarElementRecord).filter(({ type }) =>
  //       (page?.plan?.sidebar_elements ?? []).includes(type)
  //     )
  //   );
  // }, [page?.plan?.page_elements, page?.plan?.sidebar_elements]);
  useEffect(() => {
    setPermittedPageElements(
      Object.values(dynamicLayoutElements as ElementRecord).filter(
        ({ type }) => (page?.plan?.page_elements ?? []).includes(type) && type !== 'DSwag'
      )
    );
    setPermittedSidebarElements(
      Object.values({ ...dynamicSidebarElements } as SidebarElementRecord).filter(
        ({ type }) => (page?.plan?.sidebar_elements ?? []).includes(type) && type !== 'DSwag'
      )
    );
  }, [page?.plan?.page_elements, page?.plan?.sidebar_elements]);

  const buildElement = (element: EditContributionPageElement): ContributionPageElement => {
    const { type } = element;
    return {
      uuid: uuidv4(),
      content: defaultContent[type] ? defaultContent[type] : undefined,
      requiredFields: defaultRequiredFields[type] ?? [],
      type
    };
  };

  const handleElementSelected = (element: EditContributionPageElement) => {
    if (destination === 'sidebar') {
      setSidebarElements([...(sidebarElements || []), buildElement(element)]);
    } else {
      setElements([...(elements || []), buildElement(element)]);
    }
    setAddElementModalOpen(false);
  };

  const renderDynamicLayoutElements = () => {
    const dynamicElements = destination === 'sidebar' ? permittedSidebarElements : permittedPageElements;
    return dynamicElements.map((element, i) => {
      const els = destination === 'sidebar' ? sidebarElements : elements;
      // An element is disabled if it's unique and already present.
      const disabled = element.unique && els?.some((el) => el.type === element.type);
      return (
        <S.PageItemWrapper key={`${element.displayName}${i}`}>
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

const AddElementModalPropTypes = {
  addElementModalOpen: PropTypes.bool.isRequired,
  setAddElementModalOpen: PropTypes.func.isRequired,
  destination: PropTypes.oneOf(['layout', 'sidebar'])
};

AddElementModal.propTypes = AddElementModalPropTypes;

export default AddElementModal;
