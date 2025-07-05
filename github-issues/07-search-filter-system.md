# Issue: Implement Global Search and Filtering System

## 🏷️ Labels
`enhancement`, `frontend`, `backend`, `search`, `filtering`, `medium-priority`

## 📋 Summary
The application lacks search and filtering capabilities across all content types. Users cannot find specific videos, reports, flashcards, or ideas efficiently, leading to poor content discoverability as their library grows.

## 🔍 Problem Description
**Current Limitations:**
- No way to search across videos, reports, flashcards, or ideas
- No filtering by date, content type, or source video
- Users must manually browse through all content to find specific items
- No ability to organize or categorize content for easier discovery

**User Pain Points:**
- "I can't find that LinkedIn post I generated last week"
- "Where's the flashcard set from that marketing video?"
- "I need all my blog title ideas in one place"
- "Can't remember which video generated my best content"

## ✅ Acceptance Criteria

### Global Search Functionality
- [ ] **Search across all content types** - Videos, reports, flashcards, ideas
- [ ] **Fuzzy search** - Handle typos and partial matches
- [ ] **Search within content** - Search report text, flashcard questions/answers, idea text
- [ ] **Search metadata** - Video titles, channel names, descriptions
- [ ] **Real-time search** - Results update as user types (debounced)
- [ ] **Search suggestions** - Autocomplete based on user's content
- [ ] **Search history** - Recent searches with quick access

### Advanced Filtering
- [ ] **Filter by content type** - Videos, Reports, Flashcards, Ideas
- [ ] **Filter by date range** - Created today, this week, this month, custom range
- [ ] **Filter by source video** - Show all content generated from specific video
- [ ] **Filter by report type** - Medium articles vs LinkedIn posts
- [ ] **Filter by idea category** - Blog titles, social hooks, questions
- [ ] **Combine filters** - Multiple filters applied simultaneously
- [ ] **Save filter presets** - Quick access to common filter combinations

### Sorting Options
- [ ] **Sort by relevance** - Default for search results
- [ ] **Sort by date** - Newest first, oldest first
- [ ] **Sort by title/name** - Alphabetical order
- [ ] **Sort by engagement** - Most accessed/studied content first
- [ ] **Sort by rating** - User-rated content (future feature)

### Search Interface Components
- [ ] **Global search bar** - Prominent placement in header
- [ ] **Advanced search modal** - Detailed filtering options
- [ ] **Search results page** - Unified view of all matching content
- [ ] **Filter sidebar** - Easy filter application and removal
- [ ] **Search suggestions dropdown** - Real-time suggestions as user types

## 🛠️ Technical Requirements

### Backend Search Implementation

#### Database Search Strategy
```sql
-- Full-text search across multiple tables
CREATE INDEX search_videos_idx ON videos USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX search_reports_idx ON reports USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX search_flashcards_idx ON flashcards USING gin(to_tsvector('english', question || ' ' || answer));
CREATE INDEX search_ideas_idx ON ideas USING gin(to_tsvector('english', content));

-- Search API endpoint
GET /api/search?q=term&type=all&dateFrom=&dateTo=&videoId=&sort=relevance&page=1&limit=20
```

#### Search API Response Format
```typescript
interface SearchResult {
  id: number;
  type: 'video' | 'report' | 'flashcard' | 'idea';
  title: string;
  excerpt: string;
  highlightedText: string;
  createdAt: string;
  sourceVideo?: {
    id: number;
    title: string;
  };
  metadata: Record<string, any>;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  page: number;
  hasMore: boolean;
  facets: {
    types: { type: string; count: number }[];
    videos: { id: number; title: string; count: number }[];
    dateRanges: { range: string; count: number }[];
  };
}
```

### Frontend Search Implementation

#### Search Hook
```typescript
const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<SortOption>('relevance');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', searchQuery, filters, sort],
    queryFn: () => searchAPI.search({
      query: searchQuery,
      filters,
      sort,
    }),
    enabled: searchQuery.length > 2,
  });

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    results: data?.results || [],
    isLoading,
    error,
  };
};
```

#### Search Context
```typescript
// Global search state management
const SearchContext = createContext<SearchContextType | null>(null);

export const SearchProvider = ({ children }) => {
  const [globalQuery, setGlobalQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const addToSearchHistory = (query: string) => {
    setRecentSearches(prev => 
      [query, ...prev.filter(q => q !== query)].slice(0, 10)
    );
  };

  return (
    <SearchContext.Provider value={{
      globalQuery,
      setGlobalQuery,
      recentSearches,
      addToSearchHistory,
    }}>
      {children}
    </SearchContext.Provider>
  );
};
```

### Search Algorithm Implementation

#### Text Matching Strategy
```typescript
// Search ranking algorithm
const calculateRelevance = (item: SearchableItem, query: string) => {
  let score = 0;
  
  // Exact title match - highest priority
  if (item.title.toLowerCase().includes(query.toLowerCase())) {
    score += 100;
  }
  
  // Fuzzy match in content
  const contentMatch = fuzzyMatch(item.content, query);
  score += contentMatch * 50;
  
  // Recent content boost
  const daysSinceCreated = daysBetween(item.createdAt, new Date());
  score += Math.max(0, 30 - daysSinceCreated);
  
  // User engagement boost
  score += item.viewCount * 2;
  
  return score;
};
```

## 📁 Files to Create/Modify

### Backend Files
- `/server/routers/search.router.ts` - Search API endpoints
- `/server/services/searchService.ts` - Search logic and database queries
- `/server/utils/searchRanking.ts` - Relevance scoring algorithms

### Frontend Files
- `/client/src/components/search/GlobalSearchBar.tsx`
- `/client/src/components/search/SearchResults.tsx`
- `/client/src/components/search/AdvancedSearchModal.tsx`
- `/client/src/components/search/FilterSidebar.tsx`
- `/client/src/components/search/SearchSuggestions.tsx`
- `/client/src/pages/search.tsx` - Dedicated search results page
- `/client/src/hooks/useSearch.ts`
- `/client/src/contexts/SearchContext.tsx`

### Modified Files
- `/client/src/components/layout/AppLayout.tsx` - Add global search bar
- `/client/src/pages/videos/index.tsx` - Integrate search/filter
- `/client/src/pages/reports/index.tsx` - Integrate search/filter
- `/client/src/pages/flashcards/index.tsx` - Integrate search/filter
- `/client/src/pages/ideas/index.tsx` - Integrate search/filter

## 🔗 Related Issues
- Depends on: Missing frontend pages (#4)
- Enables: Better content organization and discovery
- Related to: Content tagging system (future)
- Related to: User analytics and recommendations (future)

## 💡 Implementation Notes

### Search Performance Optimization
- **Debounced Input**: Wait 300ms after user stops typing before searching
- **Caching**: Cache search results for common queries
- **Pagination**: Load results in batches of 20 items
- **Background Indexing**: Update search indexes asynchronously
- **Query Optimization**: Use database indexes effectively

### Search UX Best Practices
- **Instant Results**: Show results as user types
- **No Results State**: Helpful suggestions when no matches found
- **Search Highlighting**: Highlight matching terms in results
- **Filter Persistence**: Remember user's filter preferences
- **Mobile Optimization**: Touch-friendly search interface

### Advanced Search Features (Future)
- **Saved Searches**: Save complex searches for quick access
- **Search Alerts**: Notify when new content matches saved searches
- **Semantic Search**: AI-powered content understanding
- **Tag-based Filtering**: User-defined tags for content organization

## 🧪 Testing Checklist
- [ ] Test search with various query types and lengths
- [ ] Test filter combinations and edge cases
- [ ] Test search performance with large datasets
- [ ] Test mobile search interface
- [ ] Test search suggestions and autocomplete
- [ ] Test search history functionality
- [ ] Test search result highlighting
- [ ] Test empty states and error handling

## 🎨 User Experience Requirements

### Search Interface Design
- **Prominent Search Bar**: Always visible in header
- **Clean Results Layout**: Easy to scan and navigate
- **Filter Visual Design**: Clear active filter indicators
- **Loading States**: Skeleton screens during search
- **Empty States**: Helpful messaging and suggestions

### Interaction Design
- **Keyboard Shortcuts**: Ctrl+K to focus search, Enter to search
- **Quick Filters**: One-click common filter options
- **Result Actions**: Quick actions on each search result
- **Search History**: Easy access to previous searches

### Responsive Design
- **Mobile Search**: Overlay search interface on mobile
- **Tablet Layout**: Appropriate filter sidebar sizing
- **Touch Interactions**: Large touch targets for filters

## 📱 Mobile Considerations
- Collapsible search interface to save space
- Touch-optimized filter controls
- Swipe gestures for filter panels
- Voice search integration (future consideration)
- Offline search for cached content

## 🔍 Search Quality Metrics
- **Search Success Rate**: Users finding what they're looking for
- **Query Abandonment Rate**: Users giving up on searches
- **Click-through Rate**: Users clicking on search results
- **Search Performance**: Response time for search queries
- **Filter Usage**: Most commonly used filters

## 🚀 Future Enhancements
- **AI-Powered Search**: Semantic understanding of queries
- **Content Recommendations**: Suggest related content
- **Search Analytics**: Track user search patterns
- **External Search**: Search across connected platforms
- **Voice Search**: Speech-to-text search input