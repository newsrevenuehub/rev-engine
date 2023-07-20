import { Controls, Root } from './PageStyles.styled';

import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import { Style } from 'hooks/useStyleList';
import { donationPageBase } from 'styles/themes';
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
          styles={batchPreview?.styles || (donationPageBase as unknown as Style)}
          setStyles={(styles: Style) => addBatchChange({ styles })}
        />
      </Controls>
      <EditSaveControls
        cancelDisabled={!batchHasChanges}
        onCancel={resetBatch}
        onUpdate={commitBatch}
        variant="cancel"
      />
    </Root>
  );
}

export default PageStyles;
