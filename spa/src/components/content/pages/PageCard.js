import * as S from './PageCard.styled';
import { faBroadcastTower } from '@fortawesome/free-solid-svg-icons';

// Utils
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';

function PageCard({ page, onClick }) {
  return (
    <S.ItemCard onMouseUp={() => onClick(page.slug)} tabindex="0" data-testid={`page-card-${page.id}`}>
      {page.is_live && <S.LiveIcon icon={faBroadcastTower} />}
      <S.PreviewWrapper>
        {page.page_screenshot ? (
          <S.PageThumbnail src={page.page_screenshot} data-testid="page-card-img" />
        ) : (
          <S.NoImage data-testid="page-card-no-img">No preview</S.NoImage>
        )}
      </S.PreviewWrapper>
      <S.ItemData>
        <S.ItemName>{page.name}</S.ItemName>
        <S.PagePublishDate isLive={page.is_live}>
          <S.Label>Live on: </S.Label>
          {formatDatetimeForDisplay(page.published_date) || '---'}
        </S.PagePublishDate>
      </S.ItemData>
    </S.ItemCard>
  );
}

export default PageCard;
