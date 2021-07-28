import * as S from './DImage.styled';
import PropTypes from 'prop-types';

// Children
import DElement, { DynamicElementPropTypes } from 'components/donationPage/pageContent/DElement';

function DImage({ element, ...props }) {
  return (
    <DElement data-testid="d-image" {...props}>
      <S.DImage>DImage</S.DImage>
    </DElement>
  );
}

const imagePropTypes = {
  url: PropTypes.string.isRequired
};

DImage.propTypes = {
  element: PropTypes.shape({
    ...DynamicElementPropTypes,
    content: PropTypes.shape(imagePropTypes)
  })
};

DImage.type = 'DImage';
DImage.displayName = 'Image';
DImage.description = 'Display an image on the page';
DImage.required = false;
DImage.unique = false;

export default DImage;
