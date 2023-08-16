import { Controls, ImageSelectorHelpText, ImageSelectorWrapper, InputWrapper, Root } from './PageSetup.styled';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';

// Children
import ImageUpload from 'components/base/ImageUpload/ImageUpload';
import Input from 'elements/inputs/Input';
import { isValidWebUrl } from 'utilities/isValidWebUrl';
import EditSaveControls from '../EditSaveControls';
import EditTabHeader from '../EditTabHeader';

const INVALID_URL_MESSAGE = 'Please enter a valid URL.';

/**
 * PageSetup
 * PageSetup renders the Setup tab inside the EditInterface. It controls page content
 * that is not re-orderable.
 *
 * PageSetup is the direct child of EditInterface.
 */
function PageSetup() {
  const { addBatchChange, batchHasChanges, batchPreview, commitBatch, resetBatch } = useEditablePageBatch();
  const { errors } = usePageEditorContext();
  const handleImageChange = (type, file, thumbnailUrl) => {
    addBatchChange({ [type]: file, [`${type}_thumbnail`]: thumbnailUrl });
  };

  if (!batchPreview) {
    return null;
  }

  // If any URL field is not valid, disable the update button.
  const updateDisabled = [batchPreview.post_thank_you_redirect, batchPreview.thank_you_redirect].some(
    (value) => !isValidWebUrl(value, true)
  );

  return (
    <Root data-testid="page-setup">
      <EditTabHeader prompt="Configure page settings here. These settings are page specific." />
      <Controls>
        <ImageSelectorWrapper>
          <ImageUpload
            id="page-setup-header_bg_image"
            onChange={(file, thumbnailUrl) => handleImageChange('header_bg_image', file, thumbnailUrl)}
            label="Main header background"
            prompt="Choose an image"
            thumbnailUrl={batchPreview.header_bg_image_thumbnail}
            value={batchPreview.header_bg_image}
          />
          <ImageSelectorHelpText>Background of header bar</ImageSelectorHelpText>
        </ImageSelectorWrapper>
        <InputWrapper border>
          <Input
            type="text"
            label="Form panel heading"
            value={batchPreview.heading}
            onChange={(e) => addBatchChange({ heading: e.target.value })}
            testid="setup-heading-input"
            errors={errors.heading}
          />
        </InputWrapper>
        <ImageSelectorWrapper>
          <ImageUpload
            id="page-setup-graphic"
            onChange={(file, thumbnailUrl) => handleImageChange('graphic', file, thumbnailUrl)}
            label="Graphic"
            errors={errors.graphic}
            prompt="Choose an image"
            thumbnailUrl={batchPreview.graphic_thumbnail}
            value={batchPreview.graphic}
          />
          <ImageSelectorHelpText>Graphic displays below form panel heading</ImageSelectorHelpText>
        </ImageSelectorWrapper>
        {batchPreview.plan.custom_thank_you_page_enabled && (
          <InputWrapper>
            <Input
              errors={
                errors.thank_you_redirect ??
                (!isValidWebUrl(batchPreview.thank_you_redirect, true) && [INVALID_URL_MESSAGE])
              }
              type="url"
              label="Thank You page link"
              helpText='If you have a "Thank You" page of your own, add a link here'
              value={batchPreview.thank_you_redirect}
              onChange={(e) => addBatchChange({ thank_you_redirect: e.target.value })}
              testid="thank-you-redirect-link-input"
            />
          </InputWrapper>
        )}
        <InputWrapper border>
          <Input
            errors={
              errors.post_thank_you_redirect ??
              (!isValidWebUrl(batchPreview.post_thank_you_redirect, true) && [INVALID_URL_MESSAGE])
            }
            type="url"
            label="Post Thank You redirect"
            helpText="If using our default Thank You page, where should we redirect your contributors afterward?"
            value={batchPreview.post_thank_you_redirect}
            onChange={(e) => addBatchChange({ post_thank_you_redirect: e.target.value })}
          />
        </InputWrapper>
      </Controls>
      <EditSaveControls
        cancelDisabled={!batchHasChanges}
        onCancel={resetBatch}
        onUpdate={commitBatch}
        updateDisabled={updateDisabled}
        variant="undo"
      />
    </Root>
  );
}

export default PageSetup;

export const PAGE_SETUP_FIELDS = [
  'heading',
  'header_bg_image_thumbnail',
  'graphic_thumbnail',
  'thank_you_redirect',
  'post_thank_you_redirect',
  'donor_benefits',
  'published_date'
];
