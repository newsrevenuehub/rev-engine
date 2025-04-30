import ImageUpload from 'components/base/ImageUpload/ImageUpload';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';
import { ImageElement } from 'hooks/useContributionPage';
import { useMemo, useState } from 'react';

export type ImageEditorProps = ElementDetailEditorProps<ImageElement['content']>;

/**
 * Maximum file size allowed in bytes.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Blob/size
 * TODO in DEV-6112: set this limit across the app
 */
const MAX_FILE_SIZE = 1024 * 1024 * 2.5;

function ImageEditor({ elementContent, onChangeElementContent, setUpdateDisabled }: ImageEditorProps) {
  // The structure of elementContent varies by state.
  //
  // - If there is no image at all, `elementContent` is undefined.
  // - If the image has been selected by the user but not uploaded to the
  //   backend yet, `elementContent` is a File object.
  // - If the image has been previously been uploaded to the backend,
  //   `elementContent.url` is its URL.

  const value = useMemo(() => {
    if (elementContent === undefined) {
      return undefined;
    }

    if (elementContent instanceof File) {
      return elementContent;
    }

    return elementContent.url;
  }, [elementContent]);
  const [validationMessage, setValidationMessage] = useState<string>();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(typeof value === 'string' ? value : '');

  function handleChange(file?: File, newThumbnailUrl?: string) {
    onChangeElementContent(file);
    setThumbnailUrl(newThumbnailUrl);

    // Update validity. It's OK that we are changing element content here
    // because we're blocking update, so no changes can be saved.

    if (file && file.size > MAX_FILE_SIZE) {
      setUpdateDisabled(true);
      setValidationMessage('This file exceeds the limit of 2.5 MB.');
    } else {
      setUpdateDisabled(false);
      setValidationMessage(undefined);
    }
  }

  return (
    <>
      <ImageUpload
        label={<label htmlFor="image-editor-image-upload">Select an image to display</label>}
        value={value}
        id="image-editor-image-upload"
        onChange={handleChange}
        prompt={'Choose an image'}
        thumbnailUrl={thumbnailUrl}
      />
      {validationMessage && <p>{validationMessage}</p>}
    </>
  );
}

ImageEditor.for = 'DImage';

export default ImageEditor;
