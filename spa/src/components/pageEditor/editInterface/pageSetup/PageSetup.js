import { useState, useEffect } from 'react';
import * as S from './PageSetup.styled';

// Assets
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { useGlobalContext } from 'components/MainLayout';

// Deps
import { isBefore, isAfter } from 'date-fns';

// AJAX
import axios from 'ajax/axios';
import { DONOR_BENEFITS } from 'ajax/endpoints';

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
  const { page, setPageContent } = useEditInterfaceContext();

  // Form state
  const [heading, setPageHeading] = useState(page.heading);
  const [images, setImages] = useState({});
  const [heading_link, setHeaderLink] = useState(page.header_link);
  const [thank_you_redirect, setThankYouRedirect] = useState(page.thank_you_redirect);
  const [post_thank_you_redirect, setPostThankYouRedirect] = useState(page.post_thank_you_redirect);
  const [donor_benefits, setDonorBenefits] = useState(page.donor_benefits);
  const [published_date, setPublishedDate] = useState(new Date(page.published_date) || new Date());

  // async state
  const [availableBenefits, setAvailableBenefits] = useState([]);

  // On page load, fetch organizations donor_benefits
  useEffect(() => {
    async function fetchBenefits() {
      try {
        // NOTE: This response is paginated. Eventually, we'll need to manage that.
        const { data } = await axios.get(DONOR_BENEFITS);
        setAvailableBenefits(data.results);
      } catch (e) {
        alert.error("There was a problem fetching your donor benefits. We've been notified");
      }
    }
    fetchBenefits();
  }, []);

  const handleKeepChanges = () => {
    verifyUnpublish(updatePage);
  };

  const updatePage = () => {
    setPageContent({
      heading,
      ...images,
      heading_link,
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

  return (
    <S.PageSetup data-testid="page-setup">
      <S.PageName>{page.name}</S.PageName>
      <S.InputWrapper border>
        <Input type="text" label="Page heading" value={heading} onChange={(e) => setPageHeading(e.target.value)} />
      </S.InputWrapper>
      <S.Images>
        <S.ImageSelectorWrapper>
          <ImageWithPreview
            thumbnail={page.header_bg_image_thumbnail}
            onChange={(file) => handleImageChange('header_bg_image', file)}
            label="Header background"
            helpText="Background of header bar"
          />
        </S.ImageSelectorWrapper>
        <S.ImageSelectorWrapper>
          <ImageWithPreview
            thumbnail={page.header_logo_thumbnail}
            onChange={(file) => handleImageChange('header_logo', file)}
            label="Header logo"
            helpText="Logo to display in header"
          />
          <S.InputWrapper>
            <Input type="text" label="Logo link" value={heading_link} onChange={(e) => setHeaderLink(e.target.value)} />
          </S.InputWrapper>
        </S.ImageSelectorWrapper>
        <S.ImageSelectorWrapper>
          <ImageWithPreview
            thumbnail={page.graphic_thumbnail}
            onChange={(file) => handleImageChange('graphic', file)}
            label="Graphic"
            helpText="Graphic displays below page title"
          />
        </S.ImageSelectorWrapper>
      </S.Images>
      <S.InputWrapper>
        <Input
          label="Thank You page link"
          helpText='If you have a "Thank You" page of your own, add a link here'
          value={thank_you_redirect}
          onChange={(e) => setThankYouRedirect(e.target.value)}
        />
      </S.InputWrapper>
      <S.InputWrapper border>
        <Input
          label="Post Thank You redirect"
          helpText="If using our default Thank You page, where should we redirect your donors afterward?"
          value={post_thank_you_redirect}
          onChange={(e) => setPostThankYouRedirect(e.target.value)}
        />
      </S.InputWrapper>
      <BenefitsWidget benefits={availableBenefits} selected={donor_benefits} setSelected={(d) => setDonorBenefits(d)} />
      <PublishWidget publishDate={published_date} onChange={setPublishedDate} />
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
