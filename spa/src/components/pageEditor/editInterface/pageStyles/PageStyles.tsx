import { Controls, Root } from './PageStyles.styled';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';

// Children
import useModal from 'hooks/useModal';
import StylesChooser from 'components/pageEditor/editInterface/pageStyles/StylesChooser';
import AddStylesModal from 'components/pageEditor/editInterface/pageStyles/AddStylesModal';
import EditSaveControls from '../EditSaveControls';
import EditTabHeader from '../EditTabHeader';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { Style } from 'hooks/useStyleList';

function PageStyles() {
  const { addBatchChange, batchHasChanges, batchPreview, commitBatch, resetBatch } = useEditablePageBatch();
  const { availableStyles, setAvailableStyles } = usePageEditorContext();
  const {
    open: addStylesModalOpen,
    handleClose: handleAddStylesModalClose,
    handleOpen: handleAddStylesModalOpen
  } = useModal(false);

  const handleAddNewStyles = (newStyles: Style) => {
    setAvailableStyles([newStyles, ...availableStyles]);
    addBatchChange({ styles: newStyles });
  };

  if (!batchPreview) {
    return null;
  }

  return (
    <Root>
      <EditTabHeader
        addButtonLabel="Style"
        onAdd={handleAddStylesModalOpen}
        prompt="Add or create a new style to customize your page."
      />
      <Controls>
        <StylesChooser
          styles={availableStyles}
          selected={batchPreview.styles}
          setSelected={(styles: Style) => addBatchChange({ styles })}
        />
      </Controls>
      <EditSaveControls cancelDisabled={!batchHasChanges} onCancel={resetBatch} onUpdate={commitBatch} variant="undo" />
      <AddStylesModal
        isOpen={addStylesModalOpen}
        closeModal={handleAddStylesModalClose}
        handleAddNewStyles={handleAddNewStyles}
      />
    </Root>
  );
}

export default PageStyles;
