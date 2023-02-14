import { AmountElement } from 'hooks/useContributionPage';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { useMemo } from 'react';
import { getPageContributionIntervals } from 'utilities/getPageContributionIntervals';
import { AmountEditor } from '../elementEditors';
import { Content, ContentDetail, Header, Root } from './ElementEditor.styled';
import EditSaveControls from './EditSaveControls';
import ElementProperties from './pageElements/ElementProperties';

/**
 * Maps the `type` property of an element to which component to use as editor.
 * Only components that don't need EditInterfaceContext should be here. If an
 * element doesn't have a value set here, this component will fall back to using
 * <ElementProperties>.
 */
const editorComponents = {
  DAmount: AmountEditor
};

/**
 * Maps the `type` property of an element to the user-visible header at the top
 * of the editor. Only components that don't need EditInterfaceContext should be
 * here. If an element doesn't have a value set here, this component will fall
 * back to using <ElementProperties>.
 */
const editorHeaders = {
  DAmount: 'Contribution Amount'
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
type ElementContent = AmountElement['content'];

export function ElementEditor({ elementUuid, location, onClose }: ElementEditorProps) {
  const { addBatchChange, batchPreview, commitBatch, resetBatch } = useEditablePageBatch();
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
              elementContent={element.content ?? ({} as any)}
              onChangeElementContent={handleChangeElementContent}
              contributionIntervals={contributionIntervals}
            />
          </ContentDetail>
        </Content>
        <EditSaveControls onCancel={handleCancel} onUpdate={handleUpdate} variant="cancel" />
      </Root>
    );
  }

  // Fall back to the old editor component. Type is not the type of the element,
  // confusingly. It is whether it's in the main content or sidebar.

  return <ElementProperties selectedElementType={location} />;
}
