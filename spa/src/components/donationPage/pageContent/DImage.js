import * as S from './DImage.styled';
import PropTypes from 'prop-types';

// Util
import getSrcForImg from 'utilities/getSrcForImg';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

function DImage({ element, ...props }) {
  return (
    <DElement data-testid="d-image" {...props}>
      <S.Image src={getSrcForImg(element?.content?.url || element?.content)} />
    </DElement>
  );
}

DImage.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes
  })
};

DImage.type = 'DImage';
DImage.displayName = 'Image';
DImage.description = 'Display an image on the page';
DImage.required = false;
DImage.unique = false;

export default DImage;
