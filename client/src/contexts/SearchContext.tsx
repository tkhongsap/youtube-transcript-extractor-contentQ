import { createContext, useContext, useState } from 'react';

interface SearchContextType {
  globalQuery: string;
  setGlobalQuery: (q: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalQuery, setGlobalQuery] = useState('');
  return (
    <SearchContext.Provider value={{ globalQuery, setGlobalQuery }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearchContext = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearchContext must be used within SearchProvider');
  return ctx;
};
