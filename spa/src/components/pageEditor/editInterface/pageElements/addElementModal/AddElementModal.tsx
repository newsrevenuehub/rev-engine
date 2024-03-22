import { useState, useEffect } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Modal, ModalHeader } from 'components/base';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterfaceContextProvider';
import * as dynamicLayoutElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import PageItem from 'components/pageEditor/editInterface/pageElements/PageItem';
import { ContributionPageElement, PageElementType } from 'hooks/useContributionPage';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { AddIcon, AvailableElements, ModalContent, PageItemWrapper, Prompt } from './AddElementModal.styled';

// Additional default values to put into a newly-created element. TODO in
// DEV-3197: refactor this logic into a hook/utility function.

export const defaultContent: Partial<Record<PageElementType, unknown>> = {
  // Default reason blocks to ask for a reason at least, and have an empty list
  // of pre-supplied reasons.
  DReason: { askReason: true, reasons: [] },
  // Have an empty list of pre-supplied swags and set the threshold to $240/year
  // initially. This is a bit of a magic number.
  DSwag: { swagThreshold: 240, swags: [] }
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

  useEffect(() => {
    setPermittedPageElements(
      Object.values(dynamicLayoutElements as ElementRecord).filter(({ type }) =>
        (page?.plan?.page_elements ?? []).includes(type)
      )
    );
    setPermittedSidebarElements(
      Object.values({ ...dynamicSidebarElements } as SidebarElementRecord).filter(({ type }) =>
        (page?.plan?.sidebar_elements ?? []).includes(type)
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
        <PageItemWrapper key={`${element.displayName}${i}`}>
          <PageItem
            disabled={disabled}
            element={element}
            isStatic
            onClick={disabled ? undefined : () => handleElementSelected(element)}
            data-testid={`add-${element.type}`}
            showDescription
          />
        </PageItemWrapper>
      );
    });
  };

  return (
    <Modal open={addElementModalOpen} onClose={() => setAddElementModalOpen(false)} data-testid="add-page-modal">
      <ModalHeader icon={<AddIcon />} onClose={() => setAddElementModalOpen(false)}>
        Add Block
      </ModalHeader>
      <ModalContent>
        <Prompt>Select the block you would like to add to your page.</Prompt>
        <AvailableElements>{renderDynamicLayoutElements()}</AvailableElements>
      </ModalContent>
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
