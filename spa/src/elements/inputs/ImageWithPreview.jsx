import { Close, CloudUpload } from '@material-ui/icons';
import { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Label, HelpText } from 'elements/inputs/BaseField.styled';
import {
  Button,
  Buttons,
  ImageSection,
  NoThumbnail,
  RemoveIcon,
  Root,
  Thumbnail,
  UploadIcon
} from './ImageWithPreview.styled';

function ImageWithPreview({ thumbnail, onChange, label, helpText }) {
  const inputRef = useRef();
  const [thumbnailToShow, setThumbnailToShow] = useState(thumbnail);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      URL.revokeObjectURL(input.src);
    }
    return () => URL.revokeObjectURL(input.src);
  }, [inputRef]);

  const proxyClick = () => {
    inputRef.current.click();
  };

  const handleImageChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        setThumbnailToShow(e.target.result);
      };
      fileReader.readAsDataURL(e.target.files[0]);
      onChange(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setThumbnailToShow('');
    onChange('');
  };

  return (
    <Root>
      {label && <Label>{label}</Label>}
      <ImageSection>
        {thumbnailToShow ? (
          <Thumbnail src={thumbnailToShow} onClick={proxyClick} />
        ) : (
          <NoThumbnail onClick={proxyClick}>Choose an image</NoThumbnail>
        )}
        <Buttons>
          <Button onClick={proxyClick}>
            <UploadIcon>
              <CloudUpload />
            </UploadIcon>
          </Button>
          <Button onClick={handleRemoveImage}>
            <RemoveIcon>
              <Close />
            </RemoveIcon>
          </Button>
        </Buttons>
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleImageChange} />
      </ImageSection>
      {helpText && <HelpText>{helpText}</HelpText>}
    </Root>
  );
}

ImageWithPreview.propTypes = {
  onChange: PropTypes.func.isRequired,
  thumbnail: PropTypes.string,
  label: PropTypes.string,
  helpText: PropTypes.string
};

export default ImageWithPreview;
