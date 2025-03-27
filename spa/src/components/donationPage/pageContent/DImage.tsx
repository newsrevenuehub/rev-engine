import PropTypes, { InferProps } from 'prop-types';
import { ImageElement } from 'hooks/useContributionPage';
import DElement from './DElement';
import { Image } from './DImage.styled';
import { useImageSource } from 'hooks/useImageSource';

const DImagePropTypes = {
  element: PropTypes.object.isRequired
};

export interface DImageProps extends InferProps<typeof DImagePropTypes> {
  element: ImageElement;
}

export function DImage({ element, ...props }: DImageProps) {
  const src = useImageSource(element.content instanceof File ? element.content : element.content.url);

  if (!src) {
    return null;
  }

  return (
    <DElement data-testid="d-image" {...props}>
      <Image alt="" src={src} />
    </DElement>
  );
}

DImage.propTypes = DImagePropTypes;
DImage.type = 'DImage';
DImage.displayName = 'Image';
DImage.description = 'Display an image on the page';
DImage.required = false;
DImage.unique = false;

export default DImage;
