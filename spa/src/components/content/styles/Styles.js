import * as S from './Styles.styled';
import { ButtonSection, PlusButton } from 'components/content/pages/Pages.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';
import CircleButton from 'elements/buttons/CircleButton';

function Styles({ setShowEditStylesModal, setStyleToEdit }) {
  return (
    <S.Styles>
      <S.StylesList>
        <p>Styles</p>
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
