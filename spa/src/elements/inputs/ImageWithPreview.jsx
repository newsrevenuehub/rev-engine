import { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import * as S from './ImageWithPreview.styled';
import { Label, HelpText } from 'elements/inputs/BaseField.styled';
import { faFileUpload, faTimes } from '@fortawesome/free-solid-svg-icons';

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
    <S.ImageWithPreview>
      {label && <Label>{label}</Label>}
      <S.ImageSection>
        {thumbnailToShow ? (
          <S.Thumbnail src={thumbnailToShow} onClick={proxyClick} />
        ) : (
          <S.NoThumbnail onClick={proxyClick}>Choose an image</S.NoThumbnail>
        )}
        <S.Buttons>
          <S.Button onClick={proxyClick}>
            <S.UploadIcon icon={faFileUpload} />
          </S.Button>
          <S.Button onClick={handleRemoveImage}>
            <S.RemoveIcon icon={faTimes} />
          </S.Button>
        </S.Buttons>
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleImageChange} />
      </S.ImageSection>
      {helpText && <HelpText>{helpText}</HelpText>}
    </S.ImageWithPreview>
  );
}

ImageWithPreview.propTypes = {
  onChange: PropTypes.func.isRequired,
  thumbnail: PropTypes.string,
  label: PropTypes.string,
  helpText: PropTypes.string
};

export default ImageWithPreview;
