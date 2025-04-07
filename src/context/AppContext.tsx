// src/context/AppContext.tsx
import { createContext, useContext, useState } from 'react';

type ProviderType = 'openai' | 'gemini' | 'claude';

type AppContextType = {
  provider: ProviderType;
  setProvider: (provider: ProviderType) => void;
};

export const AppContext = createContext<AppContextType>({
  provider: 'openai',
  setProvider: () => {}
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [provider, setProvider] = useState<ProviderType>('openai'); // 初期値を 'openai' に変更

  return (
    <AppContext.Provider value={{ provider, setProvider }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
