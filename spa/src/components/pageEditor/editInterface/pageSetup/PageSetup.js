import * as S from './PageSetup.styled';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';

// Children
import ImageWithPreview from 'elements/inputs/ImageWithPreview';
import PublishWidget from './PublishWidget';

function PageSetup() {
  const { page } = usePageEditorContext();

  return (
    <S.PageSetup>
      <S.MainContent>
        <ImageWithPreview
          thumbnail={page.graphic_thumbnail}
          label="Graphic"
          helpText="Graphic displays below page title"
        />
      </S.MainContent>
      <PublishWidget />
    </S.PageSetup>
  );
}

export default PageSetup;
