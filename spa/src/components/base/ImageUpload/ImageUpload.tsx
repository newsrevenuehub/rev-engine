import { ReactComponent as CloseIcon } from '@material-design-icons/svg/filled/close.svg';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useMemo, useRef } from 'react';
import addMiddleEllipsis from 'utilities/addMiddleEllipsis';
import fileToDataUrl from 'utilities/fileToDataUrl';
import OffscreenText from '../OffscreenText/OffscreenText';
import {
  FileNameSlim,
  IconButtonSlim,
  ImageUploadWrapper,
  Label,
  PreviewSlim,
  PromptSlim,
  Slim,
  SlimThumbnail,
  SlimThumbnailWrapper
} from './ImageUpload.styled';

const ImageUploadPropTypes = {
  accept: PropTypes.string,
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  showLabel: PropTypes.bool,
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
    accept = 'image/gif,image/jpeg,image/png,image/svg+xml,image/webp',
    className,
    id,
    label,
    onChange,
    prompt,
    thumbnailUrl,
    value,
    showLabel = false
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

  const renderLabel = useMemo(() => <Label htmlFor={id}>{label}</Label>, [id, label]);

  return (
    <ImageUploadWrapper>
      {showLabel ? renderLabel : <OffscreenText>{renderLabel}</OffscreenText>}
      <Slim className={className!}>
        <input accept={accept!} hidden id={id} onChange={handleChange} ref={inputRef} type="file" />
        <PreviewSlim onClick={clickOnHiddenInput}>
          {thumbnailUrl ? (
            <>
              <SlimThumbnailWrapper>
                <SlimThumbnail
                  src={typeof value === 'string' ? value : thumbnailUrl}
                  alt={(value as File)?.name ?? prompt}
                />
              </SlimThumbnailWrapper>
              <FileNameSlim>{addMiddleEllipsis((value as File)?.name || thumbnailUrl)}</FileNameSlim>
            </>
          ) : (
            <PromptSlim>{prompt}</PromptSlim>
          )}
        </PreviewSlim>
        {thumbnailUrl && (
          <IconButtonSlim disabled={!thumbnailUrl && !value} onClick={() => onChange()} aria-label="Remove">
            <CloseIcon />
          </IconButtonSlim>
        )}
      </Slim>
    </ImageUploadWrapper>
  );
}

ImageUpload.propTypes = ImageUploadPropTypes;

export default ImageUpload;
