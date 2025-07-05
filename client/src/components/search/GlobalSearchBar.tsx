import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useSearchContext } from '@/contexts/SearchContext';

const GlobalSearchBar = () => {
  const { globalQuery, setGlobalQuery } = useSearchContext();
  const [localQuery, setLocalQuery] = useState(globalQuery);
  const { data } = useSearch(localQuery);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    setGlobalQuery(value);
  };

  return (
    <div className="relative">
      <input
        value={localQuery}
        onChange={handleChange}
        placeholder="Search..."
        className="border rounded-md px-2 py-1 w-full"
      />
      {localQuery && data?.results?.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full mt-1 text-sm">
          {data.results.slice(0, 5).map((item: any) => (
            <li key={`${item.type}-${item.id}`} className="px-2 py-1 border-b last:border-b-0">
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GlobalSearchBar;
