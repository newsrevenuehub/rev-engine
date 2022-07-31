import { useState, useCallback } from 'react';

const useModal = (initialState = false) => {
  const [open, setOpen] = useState(initialState);

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, [setOpen]);

  return { open, handleOpen, handleClose, handleToggle };
};

export default useModal;
