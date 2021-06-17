import { useState, useEffect } from 'react';
import * as S from './PageSetup.styled';

// Assets
import { faCheck, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';

// Context
import { usePageEditorContext } from 'components/pageEditor/PageEditor';

// AJAX
import axios from 'ajax/axios';
import { DONOR_BENEFITS } from 'ajax/endpoints';

// Children
import ImageWithPreview from 'elements/inputs/ImageWithPreview';
import Input from 'elements/inputs/Input';
import BenefitsWidget from './BenefitsWidget';
import PublishWidget from './PublishWidget';
import CircleButton from 'elements/buttons/CircleButton';

function PageSetup() {
  const { page, setPageContent } = usePageEditorContext();

  // Form state
  const [heading, setPageHeading] = useState(page.heading);
  const [images, setImages] = useState({});
  const [heading_link, setHeaderLink] = useState(page.header_link);
  const [thank_you_redirect, setThankYouRedirect] = useState(page.thank_you_redirect);
  const [post_thank_you_redirect, setPostThankYouRedirect] = useState(page.post_thank_you_redirect);
  const [donor_benefits, setDonorBenefits] = useState(page.donor_benefits);

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
    setPageContent({
      heading,
      ...images,
      heading_link,
      thank_you_redirect,
      post_thank_you_redirect,
      donor_benefits
    });
  };

  const handleDiscardChanges = () => {
    setPageContent({});
  };

  const handleImageChange = (type, file) => {
    setImages({ ...images, [type]: file });
  };

  return (
    <S.PageSetup>
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
      <PublishWidget />
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
