import {
  AmountElement,
  DonorAddressElement,
  DonorInfoElement,
  FrequencyElement,
  ImageElement,
  PaymentElement,
  ReasonElement,
  SwagElement
} from 'hooks/useContributionPage';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { useMemo, useState } from 'react';
import { getPageContributionIntervals } from 'utilities/getPageContributionIntervals';
import {
  AmountEditor,
  DonorAddressEditor,
  FrequencyEditor,
  ImageEditor,
  PaymentEditor,
  ReasonEditor,
  SwagEditor
} from '../elementEditors';
import { Content, ContentDetail, Header, Root } from './ElementEditor.styled';
import EditSaveControls from './EditSaveControls';
import ElementProperties from './pageElements/ElementProperties';
import ContributorInfoEditor from '../elementEditors/contributorInfo/ContributorInfoEditor';

/**
 * Maps the `type` property of an element to which component to use as editor.
 * Only components that don't need EditInterfaceContext should be here. If an
 * element doesn't have a value set here, this component will fall back to using
 * <ElementProperties>.
 */
const editorComponents = {
  DAmount: AmountEditor,
  DDonorAddress: DonorAddressEditor,
  DDonorInfo: ContributorInfoEditor,
  DFrequency: FrequencyEditor,
  DImage: ImageEditor,
  DPayment: PaymentEditor,
  DReason: ReasonEditor,
  DSwag: SwagEditor
};

/**
 * Maps the `type` property of an element to the user-visible header at the top
 * of the editor. Only components that don't need EditInterfaceContext should be
 * here. If an element doesn't have a value set here, this component will fall
 * back to using <ElementProperties>.
 */
const editorHeaders = {
  DAmount: 'Contribution Amount',
  DDonorAddress: 'Contributor Address',
  DDonorInfo: 'Contributor Info',
  DFrequency: 'Contribution Frequency',
  DImage: 'Image',
  DPayment: 'Agree to Pay Fees',
  DReason: 'Reason for Giving',
  DSwag: 'Swag'
};

export interface ElementEditorProps {
  elementUuid: string;
  location: 'layout' | 'sidebar';
  onClose: () => void;
}

/**
 * This type must be a union of all `content` properties for the elements that
 * can be edited by this component.
 */
type ElementContent =
  | AmountElement['content']
  | DonorAddressElement['content']
  | DonorInfoElement['content']
  | FrequencyElement['content']
  | ImageElement['content']
  | PaymentElement['content']
  | ReasonElement['content']
  | SwagElement['content'];

export function ElementEditor({ elementUuid, location, onClose }: ElementEditorProps) {
  const { addBatchChange, batchPreview, commitBatch, resetBatch } = useEditablePageBatch();
  const [updateDisabled, setUpdateDisabled] = useState(false);
  const elementListKey = useMemo(() => (location === 'layout' ? 'elements' : 'sidebar_elements'), [location]);
  const element = useMemo(() => {
    if (!elementListKey || !batchPreview?.[elementListKey]) {
      return;
    }

    return batchPreview[elementListKey]!.find((element) => element.uuid === elementUuid);
  }, [batchPreview, elementListKey, elementUuid]);
  const contributionIntervals = useMemo(
    () => (batchPreview ? getPageContributionIntervals(batchPreview) : []),
    [batchPreview]
  );

  if (!element || !batchPreview) {
    return null;
  }

  const heading = editorHeaders[element.type as keyof typeof editorHeaders];
  const Editor = editorComponents[element.type as keyof typeof editorComponents];

  function handleChangeElementContent(content: ElementContent) {
    if (!element || !batchPreview) {
      // Should never happen.
      throw new Error('element or batchPreview are not defined');
    }

    addBatchChange({
      [elementListKey]: [
        ...batchPreview[elementListKey]!.map((existing) => {
          if (existing.uuid === element.uuid) {
            return { ...existing, content };
          }

          return existing;
        })
      ]
    });
  }

  function handleChangeElementRequiredFields(requiredFields: string[]) {
    if (!element || !batchPreview) {
      // Should never happen.
      throw new Error('element or batchPreview are not defined');
    }

    addBatchChange({
      [elementListKey]: [
        ...batchPreview[elementListKey]!.map((existing) => {
          if (existing.uuid === element.uuid) {
            return { ...existing, requiredFields };
          }

          return existing;
        })
      ]
    });
  }

  function handleCancel() {
    resetBatch();
    onClose();
  }

  function handleUpdate() {
    commitBatch();
    onClose();
  }

  if (Editor && heading) {
    return (
      <Root>
        <Content>
          <Header>{heading}</Header>
          <ContentDetail>
            <Editor
              // This cast to `any` is because TypeScript has difficulty knowing
              // what the prop types of Editor will be since it's dynamic. The
              // editor component prop definitions provide typechecking at that
              // level. It is important that `editorComponents` have correct
              // values.
              //
              // The null coalescing is to ensure that the editor at least sees
              // an object in content, even if it has no properties. Some
              // elements, like DDonorAddress, may not have a `content` property
              // in older pages.
              contributionIntervals={contributionIntervals}
              elementContent={element.content ?? ({} as any)}
              elementRequiredFields={element.requiredFields ?? []}
              onChangeElementRequiredFields={handleChangeElementRequiredFields}
              onChangeElementContent={handleChangeElementContent}
              setUpdateDisabled={setUpdateDisabled}
            />
          </ContentDetail>
        </Content>
        <EditSaveControls
          onCancel={handleCancel}
          onUpdate={handleUpdate}
          updateDisabled={updateDisabled}
          variant="cancel"
        />
      </Root>
    );
  }

  // Fall back to the old editor component. Type is not the type of the element,
  // confusingly. It is whether it's in the main content or sidebar.

  return <ElementProperties selectedElementType={location} />;
}
