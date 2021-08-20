import { useState, useEffect } from 'react';
import * as S from './Styles.styled';
import { ButtonSection, PlusButton } from 'components/content/pages/Pages.styled';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import StyleCard from 'components/content/styles/StyleCard';

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
