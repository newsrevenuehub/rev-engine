import { ImageUploadProps } from '../ImageUpload';

const mockFile = new File([new Blob(['mock-file'], { type: 'image/png' })], 'mock-file.png');

export const ImageUpload = (props: ImageUploadProps) => (
  <>
    <button
      data-testid="mock-image-upload"
      data-thumbnail-url={props.thumbnailUrl}
      data-value={props.value}
      onClick={() => props.onChange(mockFile, 'mock-thumbnail-url')}
    >
      {props.label}
    </button>
    <button onClick={() => props.onChange()}>remove image</button>
  </>
);

export default ImageUpload;
