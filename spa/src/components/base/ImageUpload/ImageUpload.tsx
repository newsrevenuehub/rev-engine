import CloseIcon from '@material-design-icons/svg/filled/close.svg?react';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useRef } from 'react';
import addMiddleEllipsis from 'utilities/addMiddleEllipsis';
import fileToDataUrl from 'utilities/fileToDataUrl';
import {
  FileName,
  IconButton,
  ImageUploadWrapper,
  Preview,
  Prompt,
  Root,
  Thumbnail,
  ThumbnailWrapper
} from './ImageUpload.styled';

const ImageUploadPropTypes = {
  accept: PropTypes.string,
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  prompt: PropTypes.string.isRequired,
  className: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  thumbnailUrl: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(File)])
};

export interface ImageUploadProps extends InferProps<typeof ImageUploadPropTypes> {
  /**
   * Called when the user changes the image. If both arguments are undefined,
   * the user removed the image.
   */
  onChange: (value?: File, thumbnailUrl?: string) => void;
  value?: string | File | null;
}

/**
 * A form control allowing the user to choose an image. The value that the user
 * sees is fully controlled, but there is a DOM input used to manage changes
 * whose state may not reflect the value. (This can cause confusion when writing
 * E2E tests.)
 *
 * In most cases, `value` and `thumbnailUrl` should either both be provided or
 * neither. However, you can specify just a `thumbnailUrl` if you want the
 * preview of the input to match a state previously saved to the back end. The
 * remove button will be enabled in this case.
 */
export function ImageUpload(props: ImageUploadProps) {
  const {
    accept = 'image/gif,image/jpeg,image/png,image/webp',
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

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      onChange(event.target.files[0], await fileToDataUrl(event.target.files[0]));
    }
  }

  return (
    <ImageUploadWrapper>
      {label}
      <Root className={className!}>
        <input accept={accept!} hidden id={id} onChange={handleChange} ref={inputRef} type="file" />
        <Preview onClick={clickOnHiddenInput}>
          {thumbnailUrl ? (
            <>
              <ThumbnailWrapper>
                <Thumbnail
                  src={typeof value === 'string' ? value : thumbnailUrl}
                  alt={(value as File)?.name ?? prompt}
                />
              </ThumbnailWrapper>
              <FileName>{addMiddleEllipsis((value as File)?.name || thumbnailUrl)}</FileName>
            </>
          ) : (
            <Prompt>{prompt}</Prompt>
          )}
        </Preview>
        {thumbnailUrl && (
          <IconButton disabled={!thumbnailUrl && !value} onClick={() => onChange()} aria-label="Remove">
            <CloseIcon />
          </IconButton>
        )}
      </Root>
    </ImageUploadWrapper>
  );
}

ImageUpload.propTypes = ImageUploadPropTypes;

export default ImageUpload;
