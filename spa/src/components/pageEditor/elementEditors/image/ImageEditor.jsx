import * as S from './ImageEditor.styled';
// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterfaceContextProvider';
// Children
import ImageWithPreview from 'elements/inputs/ImageWithPreview';

function ImageEditor() {
  const { elementContent = { options: {} }, setElementContent } = useEditInterfaceContext();

  return (
    <S.ImageEditor>
      <ImageWithPreview
        thumbnail={elementContent?.thumbnail}
        onChange={setElementContent}
        helpText="Select an image to display"
      />
    </S.ImageEditor>
  );
}

ImageEditor.for = 'DImage';

ImageEditor.hasErrors = (file) => {
  if (!file) {
    return false;
  }

  // 2.5e6 bytes == 2.5MB
  const fileIsTooBig = file.size >= 2.5e6;
  if (fileIsTooBig) {
    return 'This file exceeds the limit of 2.5MB';
  }
  return false;
};

export default ImageEditor;
