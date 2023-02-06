import { AmountElement } from 'hooks/useContributionPage';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { useMemo } from 'react';
import { getPageContributionIntervals } from 'utilities/getPageContributionIntervals';
import { AmountEditor } from '../elementEditors';
import { Content, ContentDetail, Header, Root } from './ElementEditor.styled';
import EditSaveControls from './EditSaveControls';
import ElementProperties from './pageElements/ElementProperties';

// Only components that don't need EditInterfaceContext should be here.

const editorComponents = {
  DAmount: AmountEditor
};

// Header text for each type of element.

const editorHeaders = {
  DAmount: 'Contribution Amount'
};

export interface ElementEditorProps {
  elementUuid: string;
  location: 'layout' | 'sidebar';
  onClose: () => void;
}

export function ElementEditor({ elementUuid, location, onClose }: ElementEditorProps) {
  const { addBatchChange, batchHasChanges, batchPreview, commitBatch, resetBatch } = useEditablePageBatch();
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

  function handleChangeElementContent(content: AmountElement['content']) {
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
              elementContent={element.content as any}
              onChangeElementContent={handleChangeElementContent}
              contributionIntervals={contributionIntervals}
            />
          </ContentDetail>
        </Content>
        <EditSaveControls
          onCancel={handleCancel}
          onUpdate={handleUpdate}
          cancelDisabled={!batchHasChanges}
          variant="cancel"
        />
      </Root>
    );
  }

  // Fall back to the old editor component. Type is not the type of the element,
  // confusingly. It is whether it's in the main content or sidebar.

  return <ElementProperties selectedElementType={location} />;
}
