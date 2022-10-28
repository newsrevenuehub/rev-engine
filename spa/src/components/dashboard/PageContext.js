import { createContext, useState, useContext } from 'react';

const PageContext = createContext({
  page: null,
  setPage: () => {
    throw new Error('PageContext must be used inside a PageContextProvider');
  },
  updatedPage: null,
  setUpdatedPage: () => {
    throw new Error('PageContext must be used inside a PageContextProvider');
  }
});

const PageContextProvider = ({ children }) => {
  const [page, setPage] = useState();
  const [updatedPage, setUpdatedPage] = useState();
  return <PageContext.Provider value={{ page, setPage, updatedPage, setUpdatedPage }}>{children}</PageContext.Provider>;
};

export const usePageContext = () => useContext(PageContext);

export default PageContextProvider;
