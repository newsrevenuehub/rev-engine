import * as S from './PageCard.styled';
import { faBroadcastTower } from '@fortawesome/free-solid-svg-icons';

// Utils
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';

function PageCard({ page, onClick }) {
  return (
    <S.PageCard onMouseUp={() => onClick(page.derived_slug)} tabindex="0">
      {page.is_live && <S.LiveIcon icon={faBroadcastTower} />}
      <S.PageThumbnailWrapper>
        {page.page_screenshot ? <S.PageThumbnail src={page.page_screenshot} /> : <S.NoImage>No preview</S.NoImage>}
      </S.PageThumbnailWrapper>
      <S.PageData>
        <S.PageName>{page.name}</S.PageName>
        <S.PagePublishDate>
          <S.Label>Live on: </S.Label>
          {formatDatetimeForDisplay(page.published_date)}
        </S.PagePublishDate>
      </S.PageData>
    </S.PageCard>
  );
}

export default PageCard;
