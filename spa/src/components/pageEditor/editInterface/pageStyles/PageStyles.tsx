import { Controls, Root } from './PageStyles.styled';

import { ContributionPage } from 'hooks/useContributionPage/useContributionPage.types';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { Style } from 'hooks/useStyleList';
import { donationPageBase } from 'styles/themes';
import { isValidWebUrl } from 'utilities/isValidWebUrl';
import EditSaveControls from '../EditSaveControls';
import EditTabHeader from '../EditTabHeader';
import StylesTab from './StylesTab';

function PageStyles() {
  const { addBatchChange, batchHasChanges, batchPreview, commitBatch, resetBatch } = useEditablePageBatch();

  if (!batchPreview) {
    return null;
  }

  return (
    <Root>
      <EditTabHeader prompt="Start branding your page. Choose header logo, colors, and more." />
      <Controls>
        <StylesTab
          headerThumbnail={batchPreview?.header_logo_thumbnail}
          headerLogo={batchPreview?.header_logo}
          headerLink={batchPreview?.header_link}
          headerAltText={batchPreview?.header_logo_alt_text}
          styles={batchPreview?.styles || (donationPageBase as unknown as Style)}
          onChangePage={(changes: Partial<ContributionPage>) => addBatchChange(changes)}
          setStyles={(styles: Style) => addBatchChange({ styles })}
        />
      </Controls>
      <EditSaveControls
        updateDisabled={!isValidWebUrl(batchPreview?.header_link, true)}
        cancelDisabled={!batchHasChanges}
        onCancel={resetBatch}
        onUpdate={commitBatch}
        variant="undo"
      />
    </Root>
  );
}

export default PageStyles;
