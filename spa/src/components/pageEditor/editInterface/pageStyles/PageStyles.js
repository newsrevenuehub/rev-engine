import { useState } from 'react';
import * as S from './PageStyles.styled';

// Assets
import { faCheck, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import StylesChooser from 'components/pageEditor/editInterface/pageStyles/StylesChooser';
import AddStylesModal from 'components/pageEditor/editInterface/pageStyles/AddStylesModal';

function PageStyles({ backToProperties }) {
  const { page, availableStyles, setAvailableStyles } = usePageEditorContext();
  const { setPageContent } = useEditInterfaceContext();
  const [addStylesModalOpen, setAddStylesModalOpen] = useState(false);

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
    <S.PageStyles>
      <StylesChooser styles={availableStyles} selected={styles} setSelected={(s) => setStyles(s)} />
      <S.Buttons>
        <CircleButton
          icon={faCheck}
          type="positive"
          onClick={handleKeepChanges}
          data-testid="keep-element-changes-button"
        />
        <CircleButton
          icon={faTimes}
          type="caution"
          onClick={handleDiscardChanges}
          data-testid="discard-element-changes-button"
        />
      </S.Buttons>
      <S.AddStylesButton onClick={() => setAddStylesModalOpen(true)} data-testid="add-element-button">
        <S.AddStylesIcon icon={faPlus} />
      </S.AddStylesButton>
      <AddStylesModal
        isOpen={addStylesModalOpen}
        closeModal={() => setAddStylesModalOpen(false)}
        handleAddNewStyles={handleAddNewStyles}
      />
    </S.PageStyles>
  );
}

export default PageStyles;
