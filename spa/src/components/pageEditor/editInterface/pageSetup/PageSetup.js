import { useState } from 'react';
import { Controls, ImageSelectorHelpText, ImageSelectorWrapper, InputWrapper, Root } from './PageSetup.styled';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { useEditablePageContext } from 'hooks/useEditablePage';

// Children
import ImageUpload from 'components/base/ImageUpload/ImageUpload';
import Input from 'elements/inputs/Input';
import EditSaveControls from '../EditSaveControls';
import EditTabHeader from '../EditTabHeader';
import { isValidWebUrl } from 'utilities/isValidWebUrl';

const INVALID_URL_MESSAGE = 'Please enter a valid URL.';

/**
 * PageSetup
 * PageSetup renders the Setup tab inside the EditInterface. It controls page content
 * that is not re-orderable.
 *
 * PageSetup is the direct child of EditInterface.
 */
function PageSetup({ backToProperties }) {
  const { page } = useEditablePageContext();
  const { errors } = usePageEditorContext();
  const { setPageContent } = useEditInterfaceContext();

  // Form state
  const [heading, setPageHeading] = useState(page.heading);

  // We only initially set thumbnails based on the page to keep clear whether
  // the user has actually made changes.

  const [images, setImages] = useState({
    graphic_thumbnail: page.graphic_thumbnail,
    header_bg_image_thumbnail: page.header_bg_image_thumbnail,
    header_logo_thumbnail: page.header_logo_thumbnail
  });
  const [header_link, setHeaderLink] = useState(page.header_link);
  const [thank_you_redirect, setThankYouRedirect] = useState(page.thank_you_redirect);
  const [post_thank_you_redirect, setPostThankYouRedirect] = useState(page.post_thank_you_redirect);
  const [donor_benefits] = useState(page.donor_benefits);
  const [published_date] = useState(page.published_date ? new Date(page.published_date) : undefined);

  const handleKeepChanges = () => {
    // Coerce undefined values in `images` to empty strings, as this is what the
    // API request is looking for.

    const parsedImages = Object.keys(images).reduce((result, key) => {
      if (images[key] === undefined) {
        return { ...result, [key]: '' };
      }

      return { ...result, [key]: images[key] };
    }, {});

    setPageContent({
      heading,
      ...parsedImages,
      header_link,
      thank_you_redirect,
      post_thank_you_redirect,
      donor_benefits,
      published_date
    });
  };

  const handleDiscardChanges = () => {
    setPageHeading(page.heading);
    setImages({
      graphic_thumbnail: page.graphic_thumbnail,
      header_bg_image_thumbnail: page.header_bg_image_thumbnail,
      header_logo_thumbnail: page.header_logo_thumbnail
    });
    setHeaderLink(page.header_link);
    setPostThankYouRedirect(page.post_thank_you_redirect);
    setThankYouRedirect(page.thank_you_redirect);
    setPageContent({});
  };

  const handleImageChange = (type, file, thumbnailUrl) => {
    setImages({ ...images, [type]: file, [`${type}_thumbnail`]: thumbnailUrl });
  };

  let showLogoInput = false;
  if (page.header_logo_thumbnail) {
    showLogoInput = true;
    if ('header_logo' in images && images['header_logo'] === '') {
      showLogoInput = false;
    }
  }

  if ('header_logo' in images && images['header_logo'] !== '') {
    showLogoInput = true;
  }

  // If any URL field is not valid, disable the update button.

  const updateDisabled = [header_link, post_thank_you_redirect, thank_you_redirect].some(
    (value) => !isValidWebUrl(value, true)
  );

  // If nothing has been changed from the page object, then the user can't use
  // the Undo button. The image properties will only have values if the user has
  // chosen a new image.

  const cancelDisabled =
    header_link === page.header_link &&
    heading === page.heading &&
    !images.graphic &&
    !images.header_bg_image &&
    !images.header_bg_image &&
    !images.header_logo &&
    post_thank_you_redirect === page.post_thank_you_redirect &&
    thank_you_redirect === page.thank_you_redirect;

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
            thumbnailUrl={images.header_bg_image_thumbnail}
            value={images.header_bg_image}
          />
          <ImageSelectorHelpText>Background of header bar</ImageSelectorHelpText>
        </ImageSelectorWrapper>
        <ImageSelectorWrapper>
          <ImageUpload
            id="page-setup-header_logo"
            onChange={(file, thumbnailUrl) => handleImageChange('header_logo', file, thumbnailUrl)}
            label="Main header logo"
            prompt="Choose an image"
            thumbnailUrl={images.header_logo_thumbnail}
            value={images.header_logo}
          />
          <ImageSelectorHelpText>
            Logo to display in header. Please choose a horizontally-oriented logo with minimal padding. Images will be
            scaled down to a height of 50 px.
          </ImageSelectorHelpText>
        </ImageSelectorWrapper>
        {showLogoInput && (
          <InputWrapper border>
            <Input
              errors={!isValidWebUrl(header_link, true) && INVALID_URL_MESSAGE}
              type="url"
              label="Logo link"
              value={header_link}
              helpText="Where does clicking your logo take your users?"
              onChange={(e) => setHeaderLink(e.target.value)}
              testid="logo-link-input"
            />
          </InputWrapper>
        )}
        <InputWrapper border>
          <Input
            type="text"
            label="Form panel heading"
            value={heading}
            onChange={(e) => setPageHeading(e.target.value)}
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
            thumbnailUrl={images.graphic_thumbnail}
            value={images.graphic}
          />
          <ImageSelectorHelpText>Graphic displays below form panel heading</ImageSelectorHelpText>
        </ImageSelectorWrapper>
        {page.plan.custom_thank_you_page_enabled && (
          <InputWrapper>
            <Input
              errors={errors.thank_you_redirect ?? (!isValidWebUrl(thank_you_redirect, true) && INVALID_URL_MESSAGE)}
              type="url"
              label="Thank You page link"
              helpText='If you have a "Thank You" page of your own, add a link here'
              value={thank_you_redirect}
              onChange={(e) => setThankYouRedirect(e.target.value)}
              testid="thank-you-redirect-link-input"
            />
          </InputWrapper>
        )}
        <InputWrapper border>
          <Input
            errors={
              errors.post_thank_you_redirect ?? (!isValidWebUrl(post_thank_you_redirect, true) && INVALID_URL_MESSAGE)
            }
            type="url"
            label="Post Thank You redirect"
            helpText="If using our default Thank You page, where should we redirect your contributors afterward?"
            value={post_thank_you_redirect}
            onChange={(e) => setPostThankYouRedirect(e.target.value)}
          />
        </InputWrapper>
      </Controls>
      <EditSaveControls
        cancelDisabled={cancelDisabled}
        onCancel={handleDiscardChanges}
        onUpdate={handleKeepChanges}
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
  'header_logo_thumbnail',
  'header_link',
  'graphic_thumbnail',
  'thank_you_redirect',
  'post_thank_you_redirect',
  'donor_benefits',
  'published_date'
];
