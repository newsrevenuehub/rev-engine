import { createContext, useState, useContext } from 'react';

const PageContext = createContext({
  page: null,
  setPage: () => {
    throw new Error('PageContext must be used inside a PageContextProvider');
  }
});

const PageContextProvider = ({ children }) => {
  const [page, setPage] = useState();
  return <PageContext.Provider value={{ page, setPage }}>{children}</PageContext.Provider>;
};

export const usePageContext = () => useContext(PageContext);

export default PageContextProvider;
