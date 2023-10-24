import { MenuItem, TextField } from 'components/base';
import ImageUpload from 'components/base/ImageUpload/ImageUpload';
import PublishedPageLocaleChangeModal from 'components/common/Modal/PublishedPageLocaleChangeModal/PublishedPageLocaleChangeModal';
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { PAGE_EDITOR_LOCALE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { useEditablePageBatch } from 'hooks/useEditablePageBatch';
import useModal from 'hooks/useModal';
import useUser from 'hooks/useUser';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import { isValidWebUrl } from 'utilities/isValidWebUrl';
import EditSaveControls from '../EditSaveControls';
import EditTabHeader from '../EditTabHeader';
import { Controls, Explanation, ImageSelectorHelpText, Label, LocaleSelect, Root, Title } from './PageSettings.styled';
import { useState } from 'react';

const INVALID_URL_MESSAGE = 'Please enter a valid URL.';

export const PAGE_SETUP_FIELDS = [
  'heading',
  'header_bg_image_thumbnail',
  'graphic_thumbnail',
  'thank_you_redirect',
  'post_thank_you_redirect',
  'donor_benefits',
  'published_date'
];

/**
 * Renders the Settings tab inside the EditInterface. It controls page content
 * that is not re-orderable.
 */
function PageSettings() {
  const { user } = useUser();
  const { page } = useEditablePageContext();
  const { addBatchChange, batchHasChanges, batchPreview, commitBatch, resetBatch } = useEditablePageBatch();
  const { errors } = usePageEditorContext();
  const {
    handleClose: handleLocaleChangeModalClose,
    handleOpen: handleLocaleChangeModalOpen,
    open: localeChangeModalOpen
  } = useModal();
  const [confirmedLocaleChange, setConfirmedLocaleChange] = useState<string>();

  function handleImageChange(type: string, file?: File, thumbnailUrl?: string) {
    addBatchChange({ [type]: file, [`${type}_thumbnail`]: thumbnailUrl });
  }

  function handleLocaleModalConfirm() {
    setConfirmedLocaleChange(batchPreview!.locale);
    commitBatch();
    handleLocaleChangeModalClose();
  }

  function handleUpdate() {
    // Should never happen.

    if (!page) {
      throw new Error('Page is not defined');
    }

    if (!batchPreview) {
      throw new Error('batchPreview is not defined');
    }

    // If we are changing the locale of a live page, warn the user.
    // Otherwise, commit changes immediately.

    if (
      batchPreview.published_date &&
      batchPreview.locale !== page.locale &&
      batchPreview.locale !== confirmedLocaleChange
    ) {
      handleLocaleChangeModalOpen();
    } else {
      commitBatch();
    }
  }

  if (!batchPreview) {
    return null;
  }

  // Errors returned from the API override URL problems when displaying messages
  // to the user.
  //
  // If any URL looks invalid, don't allow updates. We need to
  // allow updates if there were field errors in the past, however.

  const postThankYouFieldError =
    (errors.post_thank_you_redirect as string | undefined) ??
    (!isValidWebUrl(batchPreview.post_thank_you_redirect, true) && INVALID_URL_MESSAGE);
  const thankYouFieldError =
    (errors.thank_you_redirect as string | undefined) ??
    (!isValidWebUrl(batchPreview.thank_you_redirect, true) && INVALID_URL_MESSAGE);
  const updateDisabled = [batchPreview.post_thank_you_redirect, batchPreview.thank_you_redirect].some(
    (value) => !isValidWebUrl(value, true)
  );

  return (
    <Root data-testid="page-setup">
      <EditTabHeader prompt="Create and change page settings." />
      <Controls>
        <div>
          <ImageUpload
            id="page-setup-header_bg_image"
            onChange={(file, thumbnailUrl) => handleImageChange('header_bg_image', file, thumbnailUrl)}
            label={<Label htmlFor="page-setup-header_bg_image">Main header background</Label>}
            prompt="Choose an image"
            thumbnailUrl={batchPreview.header_bg_image_thumbnail}
            value={batchPreview.header_bg_image}
          />
          <ImageSelectorHelpText>{errors.header_bg_image ?? 'Background of header bar'}</ImageSelectorHelpText>
        </div>
        <TextField
          error={!!errors.heading}
          id="page-setup-heading"
          fullWidth
          helperText={errors.heading}
          label="Form panel heading"
          onChange={(e) => addBatchChange({ heading: e.target.value })}
          value={batchPreview.heading}
        />
        <div>
          <ImageUpload
            id="page-setup-graphic"
            onChange={(file, thumbnailUrl) => handleImageChange('graphic', file, thumbnailUrl)}
            label={<Label htmlFor="page-setup-graphic">Graphic</Label>}
            prompt="Choose an image"
            thumbnailUrl={batchPreview.graphic_thumbnail}
            value={batchPreview.graphic}
          />
          <ImageSelectorHelpText>{errors.graphic ?? 'Graphic displays below form panel heading'}</ImageSelectorHelpText>
        </div>
        {batchPreview.plan.custom_thank_you_page_enabled && (
          <TextField
            error={!!thankYouFieldError}
            id="page-setup-thank_you_redirect"
            fullWidth
            helperText={thankYouFieldError || 'If you have a "Thank You" page of your own, add a link here'}
            label="Thank You page link"
            onChange={(e) => addBatchChange({ thank_you_redirect: e.target.value })}
            type="url"
            value={batchPreview.thank_you_redirect}
          />
        )}
        <TextField
          error={!!postThankYouFieldError}
          fullWidth
          helperText={
            postThankYouFieldError ||
            'If using our default Thank You page, where should we redirect your contributors afterward?'
          }
          id="page-setup-post_thank_you_redirect"
          label="Post Thank You redirect"
          onChange={(e) => addBatchChange({ post_thank_you_redirect: e.target.value })}
          type="url"
          value={batchPreview.post_thank_you_redirect}
        />
        {user && flagIsActiveForUser(PAGE_EDITOR_LOCALE_ACCESS_FLAG_NAME, user) && (
          <div>
            <Title>Language</Title>
            <Explanation>Language will change form labels automatically to the selected language.</Explanation>
            <LocaleSelect
              id="page-setup-locale"
              onChange={(e) => addBatchChange({ locale: e.target.value })}
              label="Page Language"
              select
              value={batchPreview.locale}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
            </LocaleSelect>
          </div>
        )}
      </Controls>
      <EditSaveControls
        cancelDisabled={!batchHasChanges}
        onCancel={resetBatch}
        onUpdate={handleUpdate}
        updateDisabled={updateDisabled}
        variant="undo"
      />
      <PublishedPageLocaleChangeModal
        open={localeChangeModalOpen}
        onClose={handleLocaleChangeModalClose}
        onConfirm={handleLocaleModalConfirm}
      />
    </Root>
  );
}

export default PageSettings;
