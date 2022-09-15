import { createContext, useState, useContext } from 'react';

export const UserContext = createContext({
  user: null,
  setUser: () => {
    throw new Error('UserContext must be used inside a UserContextProvider');
  }
});

const UserContextProvider = ({ children }) => {
  const [user, setUser] = useState();
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
};

export const useUserContext = () => useContext(UserContext);

export default UserContextProvider;
