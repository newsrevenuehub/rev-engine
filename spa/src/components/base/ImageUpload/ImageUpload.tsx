import { faFileUpload, faTimes } from '@fortawesome/free-solid-svg-icons';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useRef } from 'react';
import { IconButton, Label, Preview, Prompt, RemoveIcon, Root, Thumbnail, UploadIcon } from './ImageUpload.styled';

const ImageUploadPropTypes = {
  accept: PropTypes.string,
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  prompt: PropTypes.string.isRequired,
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  thumbnailUrl: PropTypes.string,
  value: PropTypes.instanceOf(File)
};

export interface ImageUploadProps extends InferProps<typeof ImageUploadPropTypes> {
  /**
   * Called when the user changes the image. If both arguments are undefined,
   * the user removed the image.
   */
  onChange: (value?: File, thumbnailUrl?: string) => void;
}

export function ImageUpload(props: ImageUploadProps) {
  const {
    accept = 'image/gif,image/jpeg,image/png,image/svg+xml,image/webp',
    className,
    id,
    label,
    onChange,
    prompt,
    thumbnailUrl,
    value
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  function clickOnHiddenInput() {
    if (inputRef.current) {
      inputRef.current.click();
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      const image = event.target.files[0];
      const fileReader = new FileReader();

      fileReader.onload = (event) => {
        if (!event.target) {
          throw new Error('Creating an image thumbnail failed');
        }

        onChange(image, event.target.result as string);
      };

      fileReader.readAsDataURL(image);
    } else {
      // User didn't select a file, perhaps?
      onChange();
    }
  }

  return (
    <Root className={className!}>
      <Label htmlFor={id}>{label}</Label>
      <Preview>
        <input accept={accept!} hidden id={id} onChange={handleChange} ref={inputRef} type="file" />
        {thumbnailUrl ? <Thumbnail src={thumbnailUrl} alt={value?.name ?? ''} /> : <Prompt>{prompt}</Prompt>}
      </Preview>
      <IconButton onClick={clickOnHiddenInput} aria-label="Change">
        <UploadIcon icon={faFileUpload} />
      </IconButton>
      <IconButton disabled={!value} onClick={() => onChange()} aria-label="Remove">
        <RemoveIcon icon={faTimes} />
      </IconButton>
    </Root>
  );
}

ImageUpload.propTypes = ImageUploadPropTypes;

export default ImageUpload;
