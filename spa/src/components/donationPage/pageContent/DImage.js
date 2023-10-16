import { Image } from './DImage.styled';
import PropTypes from 'prop-types';
import i18n from 'i18n';

// Util
import getSrcForImg from 'utilities/getSrcForImg';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

function DImage({ element, ...props }) {
  return (
    <DElement data-testid="d-image" {...props}>
      <Image src={getSrcForImg(element?.content?.url || element?.content)} />
    </DElement>
  );
}

DImage.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes
  })
};

DImage.type = 'DImage';
DImage.displayName = i18n.t('donationPage.dImage.image');
DImage.description = i18n.t('donationPage.dImage.displayImage');
DImage.required = false;
DImage.unique = false;

export default DImage;
