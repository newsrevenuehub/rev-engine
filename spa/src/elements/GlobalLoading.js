import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as S from './GlobalLoading.styled';
import Spinner from 'elements/Spinner';

function GlobalLoading({ wait = 500 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout = setTimeout(() => {
      setShow(true);
    }, wait);

    return () => clearTimeout(timeout);
  }, [wait]);

  if (!show) return null;
  return createPortal(
    <>
      <S.GlobalLoadingUnderlay />
      <S.GlobalLoadingOverlay>
        <Spinner />
      </S.GlobalLoadingOverlay>
    </>,
    document.getElementById('modal-root')
  );
}

export default GlobalLoading;
