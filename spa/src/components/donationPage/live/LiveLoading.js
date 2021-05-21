import { useState, useEffect } from 'react';
import * as S from './LiveLoading.styled';

const SHOW_LOADING_THRESHOLD = 500;

function LiveLoading() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let timeout = setTimeout(() => {
      setShow(true);
    }, SHOW_LOADING_THRESHOLD);
    return clearTimeout(timeout);
  }, []);

  if (!show) return null;

  return (
    <S.LiveLoading>
      <p>LiveLoading</p>
    </S.LiveLoading>
  );
}

export default LiveLoading;
