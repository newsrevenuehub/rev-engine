import { useRef, useEffect } from 'react';

/**
 * Given a value, store a reference to it and return the previous value on render.
 */
function usePreviousState<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default usePreviousState;
