import { ReactNode, createContext, useContext, useRef, useState } from 'react';

import ReauthModal from './authentication/ReauthModal';

export const ReauthContext = createContext<{ getReauth: (callbackFunction: () => void) => void }>({
  getReauth: () => undefined
});

function ReauthContextProvider({ children }: { children: ReactNode }) {
  // Reauth Context management
  const [reauthModalOpen, setReauthModalOpen] = useState(false);

  // Store reauth callbacks in ref to persist between renders
  const reauthCallbacks = useRef<(() => void)[]>([]);

  const getReauth = (cb: () => void) => {
    /*
      getReauth can be called multiple times per-load. Because of this,
      store references to the callbacks provided each time and call them
      later.
    */
    reauthCallbacks.current.push(cb);
    setReauthModalOpen(true);
  };

  const closeReauthModal = () => {
    // Don't forget to clear out the refs when the modal closes.
    reauthCallbacks.current = [];
    setReauthModalOpen(false);
  };

  return (
    <ReauthContext.Provider value={{ getReauth }}>
      {children}
      <ReauthModal isOpen={reauthModalOpen} callbacks={reauthCallbacks.current} closeModal={closeReauthModal} />
    </ReauthContext.Provider>
  );
}

export const useReauthContext = () => useContext(ReauthContext);

export default ReauthContextProvider;
