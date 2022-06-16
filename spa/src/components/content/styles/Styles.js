import { useEffect, useState } from 'react';
import * as S from './Styles.styled';
import { ButtonSection, PlusButton } from 'components/content/pages/Pages.styled';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import StyleCard from 'components/content/styles/StyleCard';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

const STYLE_COUNT_TO_ENABLE_SEARCH = 5;

export const filterStyles = (stylesRaw, qry) => {
  let styles;
  if (qry) {
    styles = [];
    for (let i = 0; i < stylesRaw.length; i++) {
      let style = stylesRaw[i];
      if (style.name.toLowerCase().indexOf(qry) !== -1) {
        styles.push(style);
      } else if (style.revenue_program) {
        if (
          style.revenue_program.slug.toLowerCase().indexOf(qry) !== -1 ||
          style.revenue_program.name.toLowerCase().indexOf(qry) !== -1
        ) {
          styles.push(style);
        }
      }
    }
  } else {
    styles = stylesRaw;
  }

  return styles;
};

function Styles({ setShowEditStylesModal, setStyleToEdit, fetchStyles, styles }) {
  const [styleSearchQuery, setStyleSearchQuery] = useState([]);

  // Fetch styles
  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const stylesQueryChange = async (e) => {
    e.preventDefault();
    const timeOutId = setTimeout(() => setStyleSearchQuery(e.target.value.toLowerCase()), 500);
    return () => clearTimeout(timeOutId);
  };

  const handleStyleSelect = (style) => {
    setStyleToEdit(style);
    setShowEditStylesModal(true);
  };

  const stylesFiltered = filterStyles(styles, styleSearchQuery);

  console.log(stylesFiltered);

  return (
    <GenericErrorBoundary>
      <S.Styles data-testid="styles-list">
        {styles && styles.length > STYLE_COUNT_TO_ENABLE_SEARCH ? (
          <S.StylesSearch layout>
            <input
              className="filterBy"
              placeholder="Search Styles by Name, Revenue-program"
              onChange={stylesQueryChange}
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
