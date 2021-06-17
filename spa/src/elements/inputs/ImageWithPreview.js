import { useRef, useEffect, useState } from 'react';
import * as S from './ImageWithPreview.styled';

function ImageWithPreview({ thumbnail, onChange, label, helpText }) {
  const inputRef = useRef();
  const [newThumbnail, setNewThumbnail] = useState('');

  useEffect(() => {
    // const input = inputRef.current;
    // if (input) {
    //   URL.revokeObjectURL(input.src);
    // }
    // return () => URL.revokeObjectURL(input.src);
  }, [inputRef]);

  const proxyClick = () => {
    inputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        setNewThumbnail(e.target.result);
      };
      fileReader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <S.ImageWithPreview>
      <S.Thumbnail src={newThumbnail || thumbnail} />
      <>
        <S.Button role="button" aria-label="File upload" type="primary" onClick={proxyClick}>
          {thumbnail ? 'Change' : 'Choose'}
        </S.Button>
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
      </>
    </S.ImageWithPreview>
  );
}

export default ImageWithPreview;
