import { useRef, useEffect } from 'react';

/**
 * Given a value, store a reference to it and return the previous value on render.
 */
function usePreviousState(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default usePreviousState;
