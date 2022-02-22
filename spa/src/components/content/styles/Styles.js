import { useEffect } from 'react';
import * as S from './Styles.styled';
import { ButtonSection, PlusButton } from 'components/content/pages/Pages.styled';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import StyleCard from 'components/content/styles/StyleCard';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

function Styles({ setShowEditStylesModal, setStyleToEdit, fetchStyles, styles }) {
  // Fetch styles
  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const handleStyleSelect = (style) => {
    setStyleToEdit(style);
    setShowEditStylesModal(true);
  };

  return (
    <GenericErrorBoundary>
      <S.Styles data-testid="styles-list">
        <S.StylesList>
          {styles.map((style) => (
            <StyleCard style={style} key={style.id} onSelect={handleStyleSelect} />
          ))}
        </S.StylesList>
        <ButtonSection>
          <PlusButton onClick={() => setShowEditStylesModal(true)} data-testid="style-create-button">
            <CircleButton icon={faPlus} />
          </PlusButton>
        </ButtonSection>
      </S.Styles>
    </GenericErrorBoundary>
  );
}

export default Styles;
