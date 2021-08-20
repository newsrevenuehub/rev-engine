import { useState, useEffect } from 'react';
import * as S from './Styles.styled';
import { ButtonSection, PlusButton } from 'components/content/pages/Pages.styled';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';

// Deps
import { useAlert } from 'react-alert';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import StyleCard from 'components/content/styles/StyleCard';

function Styles({ setShowEditStylesModal, setStyleToEdit }) {
  const alert = useAlert();
  const requestGetStyles = useRequest();
  const [styles, setStyles] = useState([]);

  // Fetch styles
  useEffect(() => {
    requestGetStyles(
      { method: 'GET', url: LIST_STYLES },
      {
        onSuccess: ({ data }) => setStyles(data),
        onFailure: () => alert.error(GENERIC_ERROR)
      }
    );
  }, [alert]);

  const handleStyleSelect = (style) => {
    setStyleToEdit(style);
    setShowEditStylesModal(true);
  };

  return (
    <S.Styles>
      <S.StylesList>
        {styles.map((style) => (
          <StyleCard style={style} onSelect={handleStyleSelect} />
        ))}
      </S.StylesList>
      <ButtonSection>
        <PlusButton onClick={() => setShowEditStylesModal(true)} data-testid="style-create-button">
          <CircleButton icon={faPlus} />
        </PlusButton>
      </ButtonSection>
    </S.Styles>
  );
}

export default Styles;
