import * as S from './StyleCard.styled';
import { ItemCard, LiveIcon, PreviewWrapper, ItemData, ItemName } from 'components/content/pages/PageCard.styled';
import { faBroadcastTower } from '@fortawesome/free-solid-svg-icons';

function StyleCard({ style, onSelect }) {
  return (
    <ItemCard onMouseUp={() => onSelect(style)} tabindex="0" data-testid={`style-card-${style.id}`}>
      {style.used_live && <LiveIcon icon={faBroadcastTower} data-testid={`style-${style.id}-live`} />}
      <PreviewWrapper>
        <S.StylePreview style={style}>
          {style.colors?.primary && <S.ColorSwatch color={style.colors.primary} />}
          {style.colors?.secondary && <S.ColorSwatch color={style.colors.secondary} />}
          {style.colors?.fieldBackground && <S.ColorSwatch color={style.colors.fieldBackground} />}
          {style.colors?.paneBackground && <S.ColorSwatch color={style.colors.paneBackground} />}
        </S.StylePreview>
      </PreviewWrapper>
      <ItemData>
        <ItemName>{style.name}</ItemName>
      </ItemData>
    </ItemCard>
  );
}

export default StyleCard;
