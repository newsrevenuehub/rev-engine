import { useEffect, useState } from 'react';
import * as S from './Styles.styled';
import { ButtonSection, PlusButton } from 'components/content/pages/Pages.styled';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import StyleCard from 'components/content/styles/StyleCard';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

const STYLE_COUNT_TO_ENABLE_SEARCH = 2;

export const filterStyles = (stylesRaw, qry) => {
  return qry
    ? stylesRaw.filter((style) => {
        return (
          style.name.toLowerCase().indexOf(qry) !== -1 ||
          (style.revenue_program &&
            (style.revenue_program.slug.toLowerCase().indexOf(qry) !== -1 ||
              style.revenue_program.name.toLowerCase().indexOf(qry) !== -1))
        );
      })
    : stylesRaw;
};

function Styles({ setShowEditStylesModal, setStyleToEdit, fetchStyles, styles }) {
  const [styleSearchQuery, setStyleSearchQuery] = useState([]);

  // Fetch styles
  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const handleStyleSelect = (style) => {
    setStyleToEdit(style);
    setShowEditStylesModal(true);
  };

  const stylesFiltered = filterStyles(styles, styleSearchQuery);

  return (
    <GenericErrorBoundary>
      <S.Styles data-testid="styles-list">
        {styles && styles.length > STYLE_COUNT_TO_ENABLE_SEARCH ? (
          <S.StylesSearch layout>
            <input
              placeholder="Search Styles by Name, Revenue-program"
              onChange={(e) => setStyleSearchQuery(e.target.value)}
            />
          </S.StylesSearch>
        ) : null}
        <S.StylesList>
          {stylesFiltered.map((style) => (
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
