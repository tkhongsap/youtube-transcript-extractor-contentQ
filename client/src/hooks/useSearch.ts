import { useQuery } from '@tanstack/react-query';

export const useSearch = (query: string, type?: string) => {
  return useQuery({
    queryKey: ['search', query, type],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (type) params.append('type', type);
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search request failed');
      return res.json();
    },
    enabled: query.length > 1,
  });
};
