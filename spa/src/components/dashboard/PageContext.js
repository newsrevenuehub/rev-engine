import { createContext, useState, useContext } from 'react';

const PageContext = createContext(null);

const PageContextProvider = ({ children }) => {
  const [page, setPage] = useState();
  return <PageContext.Provider value={{ page, setPage }}>{children}</PageContext.Provider>;
};

export const usePageContext = () => useContext(PageContext);

export default PageContextProvider;
