import { useState } from 'react';
import { Buttons, Controls, Root } from './PageStyles.styled';

// Assets
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { useEditablePageContext } from 'hooks/useEditablePage';

// Children
import useModal from 'hooks/useModal';
import CircleButton from 'elements/buttons/CircleButton';
import StylesChooser from 'components/pageEditor/editInterface/pageStyles/StylesChooser';
import AddStylesModal from 'components/pageEditor/editInterface/pageStyles/AddStylesModal';
import EditTabHeader from '../EditTabHeader';

function PageStyles({ backToProperties }) {
  const { page } = useEditablePageContext();
  const { availableStyles, setAvailableStyles } = usePageEditorContext();
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
    backToProperties();
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
      <Buttons>
        <CircleButton
          icon={faCheck}
          buttonType="positive"
          onClick={handleKeepChanges}
          data-testid="keep-element-changes-button"
        />
        <CircleButton
          icon={faTimes}
          buttonType="caution"
          onClick={handleDiscardChanges}
          data-testid="discard-element-changes-button"
        />
      </Buttons>
      <AddStylesModal
        isOpen={addStylesModalOpen}
        closeModal={handleAddStylesModalClose}
        handleAddNewStyles={handleAddNewStyles}
      />
    </Root>
  );
}

export default PageStyles;
