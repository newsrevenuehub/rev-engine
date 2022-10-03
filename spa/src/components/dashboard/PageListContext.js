import { createContext, useState, useContext } from 'react';

const PageListContext = createContext({
  pages: null,
  setPages: () => {
    throw new Error('PageListContext must be used inside a PageListContextProvider');
  }
});

const PageListContextProvider = ({ children }) => {
  const [pages, setPages] = useState();
  return <PageListContext.Provider value={{ pages, setPages }}>{children}</PageListContext.Provider>;
};

export const usePageListContext = () => useContext(PageListContext);

export default PageListContextProvider;
