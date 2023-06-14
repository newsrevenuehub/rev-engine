import * as S from './StyleCard.styled';
import { ItemCard, LiveIcon, PreviewWrapper, ItemData, ItemName } from 'components/content/pages/PageCard.styled';
import { faBroadcastTower } from '@fortawesome/free-solid-svg-icons';

function StyleCard({ style, onSelect }) {
  return (
    <ItemCard onMouseUp={() => onSelect(style)} tabindex="0" data-testid={`style-card-${style.id}`}>
      {style.used_live && <LiveIcon icon={faBroadcastTower} data-testid={`style-${style.id}-live`} />}
      <PreviewWrapper>
        <S.StylePreview style={style}>
          {style.colors?.cstm_mainBackground && <S.ColorSwatch color={style.colors.cstm_mainBackground} />}
          {style.colors?.cstm_formPanelBackground && <S.ColorSwatch color={style.colors.cstm_formPanelBackground} />}
          {style.colors?.cstm_mainHeader && <S.ColorSwatch color={style.colors.cstm_mainHeader} />}
          {style.colors?.cstm_CTAs && <S.ColorSwatch color={style.colors.cstm_CTAs} />}
          {style.colors?.cstm_ornaments && <S.ColorSwatch color={style.colors.cstm_ornaments} />}
        </S.StylePreview>
      </PreviewWrapper>
      <ItemData>
        <ItemName>{style.name}</ItemName>
      </ItemData>
    </ItemCard>
  );
}

export default StyleCard;
