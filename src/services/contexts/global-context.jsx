import { createContext, useContext, useState } from "react";

const GC = createContext();

export const GlobalProvider = ({ children }) => {
  const [user, setUserState] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [showSidebar, setShowSidebar] = useState(false);

  const setUser = (userData) => {
    setUserState(userData);
    if (userData) localStorage.setItem("user", JSON.stringify(userData));
    else localStorage.removeItem("user");
  };

  return (  
    <GC.Provider value={{
      user, setUser,
      showSidebar, setShowSidebar,
    }}>
      {children}
    </GC.Provider>
  )
}

export const GlobalContext = () => useContext(GC);