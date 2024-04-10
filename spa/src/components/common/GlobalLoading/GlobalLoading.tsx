import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircularProgress } from 'components/base';
import { Root } from './GlobalLoading.styled';

const GlobalLoadingPropTypes = {
  /**
   * How long in milliseconds to wait before the overlay appears. Defaults to
   * 500.
   */
  wait: PropTypes.number
};

export type GlobalLoadingProps = InferProps<typeof GlobalLoadingPropTypes>;

export function GlobalLoading({ wait = 500 }: GlobalLoadingProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShow(true);
    }, wait!);

    return () => window.clearTimeout(timeout);
  }, [wait]);

  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) {
    return null;
  }

  return createPortal(
    <Root>
      <CircularProgress />
    </Root>,
    document.getElementById('modal-root')!
  );
}

GlobalLoading.propTypes = GlobalLoadingPropTypes;
export default GlobalLoading;
