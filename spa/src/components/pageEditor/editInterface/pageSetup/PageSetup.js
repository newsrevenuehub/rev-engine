import { useState } from 'react';
import * as S from './PageSetup.styled';

// Assets
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { useGlobalContext } from 'components/MainLayout';

// Deps
import { isBefore, isAfter } from 'date-fns';

// Children
import ImageWithPreview from 'elements/inputs/ImageWithPreview';
import Input from 'elements/inputs/Input';
import BenefitsWidget from './BenefitsWidget';
import PublishWidget from './PublishWidget';
import CircleButton from 'elements/buttons/CircleButton';

/**
 * PageSetup
 * PageSetup renders the Setup tab inside the EditInterface. It controls page content
 * that is not re-orderable.
 *
 * PageSetup is the direct child of EditInterface.
 */
function PageSetup({ backToProperties }) {
  const { getUserConfirmation } = useGlobalContext();
  const { page, errors, availableBenefits } = usePageEditorContext();
  const { setPageContent } = useEditInterfaceContext();

  // Form state
  const [heading, setPageHeading] = useState(page.heading);
  const [images, setImages] = useState({});
  const [header_link, setHeaderLink] = useState(page.header_link);
  const [thank_you_redirect, setThankYouRedirect] = useState(page.thank_you_redirect);
  const [post_thank_you_redirect, setPostThankYouRedirect] = useState(page.post_thank_you_redirect);
  const [donor_benefits, setDonorBenefits] = useState(page.donor_benefits);
  const [published_date, setPublishedDate] = useState(page.published_date ? new Date(page.published_date) : undefined);

  const handleKeepChanges = () => {
    verifyUnpublish(updatePage);
  };

  const updatePage = () => {
    setPageContent({
      heading,
      ...images,
      header_link,
      thank_you_redirect,
      post_thank_you_redirect,
      donor_benefits,
      published_date
    });
    backToProperties();
  };

  const handleDiscardChanges = () => {
    setPageContent({});
    backToProperties();
  };

  const handleImageChange = (type, file) => {
    setImages({ ...images, [type]: file });
  };

  const verifyUnpublish = (cb) => {
    // If a page was previously published, but we're now setting it to a future date, warn.
    const pageOriginallyPublished = page.published_date && isBefore(new Date(page.published_date), new Date());
    const newDateAfterNow = published_date && isAfter(new Date(published_date), new Date());
    if (pageOriginallyPublished && newDateAfterNow) {
      getUserConfirmation('This page is currently live. Unpublish this page?', cb);
    } else {
      cb();
    }
  };

  console.log('errors', errors);

  return (
    <S.PageSetup data-testid="page-setup">
      <S.PageName>{page.name}</S.PageName>
      <S.InputWrapper border>
        <Input
          type="text"
          label="Page heading"
          value={heading}
          onChange={(e) => setPageHeading(e.target.value)}
          testid="setup-heading-input"
          errors={errors.heading}
        />
      </S.InputWrapper>
      <S.Images>
        <S.ImageSelectorWrapper>
          <ImageWithPreview
            thumbnail={page.header_bg_image_thumbnail}
            onChange={(file) => handleImageChange('header_bg_image', file)}
            label="Header background"
            helpText="Background of header bar"
            errors={errors.header_bg_image}
          />
        </S.ImageSelectorWrapper>
        <S.ImageSelectorWrapper>
          <ImageWithPreview
            thumbnail={page.header_logo_thumbnail}
            onChange={(file) => handleImageChange('header_logo', file)}
            label="Header logo"
            helpText="Logo to display in header"
            errors={errors.header_logo_thumbnail}
          />
          <S.InputWrapper>
            <Input
              type="text"
              label="Logo link"
              value={header_link}
              helpText="Where does clicking your logo take your users?"
              onChange={(e) => setHeaderLink(e.target.value)}
              errors={errors.header_link}
              testid="logo-link-input"
            />
          </S.InputWrapper>
        </S.ImageSelectorWrapper>
        <S.ImageSelectorWrapper>
          <ImageWithPreview
            thumbnail={page.graphic_thumbnail}
            onChange={(file) => handleImageChange('graphic', file)}
            label="Graphic"
            helpText="Graphic displays below page title"
            errors={errors.graphic_thumbnail}
          />
        </S.ImageSelectorWrapper>
      </S.Images>
      <S.InputWrapper>
        <Input
          label="Thank You page link"
          helpText='If you have a "Thank You" page of your own, add a link here'
          value={thank_you_redirect}
          onChange={(e) => setThankYouRedirect(e.target.value)}
          errors={errors.thank_you_redirect}
        />
      </S.InputWrapper>
      <S.InputWrapper border>
        <Input
          label="Post Thank You redirect"
          helpText="If using our default Thank You page, where should we redirect your donors afterward?"
          value={post_thank_you_redirect}
          onChange={(e) => setPostThankYouRedirect(e.target.value)}
          errors={errors.post_thank_you_redirect}
        />
      </S.InputWrapper>
      <BenefitsWidget
        benefits={availableBenefits}
        selected={donor_benefits}
        setSelected={(d) => setDonorBenefits(d)}
        errors={errors.donor_benefits}
      />
      <PublishWidget publishDate={published_date} onChange={setPublishedDate} errors={errors.published_date} />
      <S.Buttons>
        <CircleButton
          icon={faCheck}
          type="positive"
          onClick={handleKeepChanges}
          data-testid="keep-element-changes-button"
        />
        <CircleButton
          icon={faTimes}
          type="caution"
          onClick={handleDiscardChanges}
          data-testid="discard-element-changes-button"
        />
      </S.Buttons>
    </S.PageSetup>
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
