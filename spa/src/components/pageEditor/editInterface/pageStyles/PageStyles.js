import { useState } from 'react';
import { Controls, Root } from './PageStyles.styled';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import useModal from 'hooks/useModal';
import StylesChooser from 'components/pageEditor/editInterface/pageStyles/StylesChooser';
import AddStylesModal from 'components/pageEditor/editInterface/pageStyles/AddStylesModal';
import EditSaveControls from '../EditSaveControls';
import EditTabHeader from '../EditTabHeader';

function PageStyles({ backToProperties }) {
  const { page, availableStyles, setAvailableStyles } = usePageEditorContext();
  const { setPageContent } = useEditInterfaceContext();
  const {
    open: addStylesModalOpen,
    handleClose: handleAddStylesModalClose,
    handleOpen: handleAddStylesModalOpen
  } = useModal(false);

  // Styles state
  const [styles, setStyles] = useState(page.styles);

  const handleKeepChanges = () => {
    setPageContent({ styles });
    backToProperties();
  };

  const handleDiscardChanges = () => {
    console.log('Undoing styles');
    setStyles(page.styles);
  };

  const handleAddNewStyles = (newStyles) => {
    setAvailableStyles([newStyles, ...availableStyles]);
    setStyles(newStyles);
  };

  return (
    <Root>
      <EditTabHeader
        addButtonLabel="Style"
        onAdd={handleAddStylesModalOpen}
        prompt="Add or create a new style to customize your page."
      />
      <Controls>
        <StylesChooser styles={availableStyles} selected={styles} setSelected={setStyles} />
      </Controls>
      <EditSaveControls
        cancelDisabled={styles === page.styles}
        onCancel={handleDiscardChanges}
        onUpdate={handleKeepChanges}
        variant="undo"
      />
      <AddStylesModal
        isOpen={addStylesModalOpen}
        closeModal={handleAddStylesModalClose}
        handleAddNewStyles={handleAddNewStyles}
      />
    </Root>
  );
}

export default PageStyles;
