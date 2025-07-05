import { useSearchParams } from 'wouter';
import { useSearch } from '@/hooks/useSearch';

const SearchPage = () => {
  const [params] = useSearchParams();
  const query = params.q || '';
  const { data, isLoading } = useSearch(query);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <h1 className="text-xl font-semibold mb-4">Search Results for "{query}"</h1>
      {isLoading && <p>Loading...</p>}
      {data?.results?.map((item: any) => (
        <div key={`${item.type}-${item.id}`} className="mb-2 p-2 border rounded">
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-gray-600">{item.type}</p>
        </div>
      ))}
      {data && data.results.length === 0 && <p>No results.</p>}
    </main>
  );
};

export default SearchPage;
