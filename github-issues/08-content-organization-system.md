# Issue: Implement Content Organization and Tagging System

## 🏷️ Labels
`enhancement`, `frontend`, `backend`, `organization`, `tagging`, `medium-priority`

## 📋 Summary
Users need ways to organize and categorize their growing content library. Currently, content is only organized by creation date and source video, making it difficult to group related content or create custom organization systems.

## 🔍 Problem Description
**Current Limitations:**
- No way to tag or categorize content for custom organization
- No favorites or bookmarking system for important content
- No collections or folders to group related content
- No way to organize content by topics, projects, or campaigns
- Difficult to find content for specific use cases or contexts

**User Scenarios:**
- "I want to group all my marketing-related content together"
- "Need to bookmark my best-performing content ideas"
- "Want to organize content by client or project"
- "Need a 'drafts' collection for content I'm still working on"

## ✅ Acceptance Criteria

### Tagging System
- [ ] **Add tags to videos** - Custom user-defined tags
- [ ] **Add tags to all content types** - Reports, flashcards, ideas
- [ ] **Tag autocomplete** - Suggest existing tags as user types
- [ ] **Tag management** - Create, rename, delete, merge tags
- [ ] **Tag-based filtering** - Filter content by one or multiple tags
- [ ] **Popular tags** - Show most frequently used tags
- [ ] **Tag colors** - Visual categorization with color coding

### Favorites System
- [ ] **Favorite videos** - Mark videos as favorites
- [ ] **Favorite content** - Mark individual reports, flashcards, ideas
- [ ] **Favorites view** - Dedicated view for all favorited content
- [ ] **Quick favorite toggle** - One-click favoriting from any view
- [ ] **Favorite filters** - Show only favorited content in lists

### Collections/Folders
- [ ] **Create collections** - User-defined groups of content
- [ ] **Collection types** - Support different collection purposes
- [ ] **Add to collections** - Add content from any view to collections
- [ ] **Collection management** - Create, edit, delete, reorder collections
- [ ] **Nested collections** - Sub-collections for hierarchical organization
- [ ] **Collection sharing** - Share collections with other users (future)

### Content Status System
- [ ] **Content status** - Draft, Published, Archived, etc.
- [ ] **Status filtering** - Filter by content status
- [ ] **Bulk status updates** - Change status of multiple items
- [ ] **Status workflows** - Define custom status transitions

### Organization UI Components
- [ ] **Tag input component** - Easy tag addition and management
- [ ] **Collection picker** - Modal for adding content to collections
- [ ] **Organization sidebar** - Navigate by tags, collections, favorites
- [ ] **Bulk operations** - Select multiple items for organization
- [ ] **Quick actions menu** - Right-click context menu for organization

## 🛠️ Technical Requirements

### Database Schema Extensions

#### Tags System
```sql
-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7), -- hex color code
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many relationships
CREATE TABLE video_tags (
  video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

CREATE TABLE report_tags (
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, tag_id)
);

-- Similar for flashcard_tags, idea_tags
```

#### Collections System
```sql
-- Collections table
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  user_id INTEGER REFERENCES users(id),
  parent_id INTEGER REFERENCES collections(id), -- for nested collections
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Collection items (polymorphic association)
CREATE TABLE collection_items (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- 'video', 'report', 'flashcard_set', 'idea_set'
  item_id INTEGER NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(collection_id, item_type, item_id)
);
```

#### Enhanced Content Tables
```sql
-- Add organization fields to existing tables
ALTER TABLE videos ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN status VARCHAR(20) DEFAULT 'active';

ALTER TABLE reports ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN status VARCHAR(20) DEFAULT 'draft';

-- Similar for flashcard_sets, idea_sets
```

### API Endpoints

#### Tags Management
```typescript
GET /api/tags - Get user's tags
POST /api/tags - Create new tag
PUT /api/tags/:id - Update tag
DELETE /api/tags/:id - Delete tag
GET /api/tags/popular - Get most used tags

// Tagging content
POST /api/videos/:id/tags - Add tags to video
DELETE /api/videos/:id/tags/:tagId - Remove tag from video
GET /api/content/tags/:tagId - Get all content with specific tag
```

#### Collections Management
```typescript
GET /api/collections - Get user's collections
POST /api/collections - Create collection
PUT /api/collections/:id - Update collection
DELETE /api/collections/:id - Delete collection
POST /api/collections/:id/items - Add item to collection
DELETE /api/collections/:id/items/:itemId - Remove item from collection
```

#### Favorites Management
```typescript
POST /api/videos/:id/favorite - Toggle video favorite
POST /api/reports/:id/favorite - Toggle report favorite
GET /api/favorites?type=videos - Get favorited content by type
```

### Frontend Implementation

#### Organization Hooks
```typescript
const useTags = () => {
  const { data: tags } = useQuery(['tags'], () => api.get('/api/tags'));
  
  const createTag = useMutation(
    (tag: CreateTagRequest) => api.post('/api/tags', tag),
    {
      onSuccess: () => queryClient.invalidateQueries(['tags']),
    }
  );
  
  return { tags, createTag };
};

const useCollections = () => {
  const { data: collections } = useQuery(['collections'], 
    () => api.get('/api/collections')
  );
  
  const addToCollection = useMutation(
    ({ collectionId, item }: AddToCollectionRequest) =>
      api.post(`/api/collections/${collectionId}/items`, item)
  );
  
  return { collections, addToCollection };
};
```

#### Tag Input Component
```typescript
interface TagInputProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  suggestions?: Tag[];
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ value, onChange, suggestions }) => {
  // Autocomplete functionality
  // Tag creation and selection
  // Visual tag display with colors
  // Remove tag functionality
};
```

## 📁 Files to Create/Modify

### Backend Files
- `/server/routers/tags.router.ts` - Tag management endpoints
- `/server/routers/collections.router.ts` - Collection management
- `/server/routers/favorites.router.ts` - Favorites management
- `/shared/schema.ts` - Add organization schemas

### Frontend Components
- `/client/src/components/organization/TagInput.tsx`
- `/client/src/components/organization/TagManager.tsx`
- `/client/src/components/organization/CollectionPicker.tsx`
- `/client/src/components/organization/CollectionManager.tsx`
- `/client/src/components/organization/OrganizationSidebar.tsx`
- `/client/src/components/organization/BulkOperations.tsx`
- `/client/src/components/organization/QuickActionsMenu.tsx`

### New Pages
- `/client/src/pages/organization/tags.tsx` - Tag management page
- `/client/src/pages/organization/collections.tsx` - Collection management
- `/client/src/pages/favorites.tsx` - All favorited content

### Hooks and Context
- `/client/src/hooks/useTags.ts`
- `/client/src/hooks/useCollections.ts`
- `/client/src/hooks/useFavorites.ts`
- `/client/src/contexts/OrganizationContext.tsx`

### Modified Files
- All content card components - Add organization actions
- All list pages - Add organization filters
- `/client/src/components/layout/Sidebar.tsx` - Add organization navigation

## 🔗 Related Issues
- Depends on: Search and filtering system (#7)
- Enables: Advanced content discovery
- Related to: Content sharing and collaboration (future)
- Related to: User analytics and insights (future)

## 💡 Implementation Notes

### Tag System Best Practices
- **Case Insensitive**: Treat "Marketing" and "marketing" as same tag
- **Tag Suggestions**: Learn from user behavior to suggest relevant tags
- **Tag Cleanup**: Provide tools to merge similar tags
- **Tag Limits**: Reasonable limits to prevent tag pollution
- **Reserved Tags**: System tags that users cannot delete

### Collection Design Patterns
- **Smart Collections**: Auto-updating collections based on criteria
- **Collection Templates**: Pre-made collections for common use cases
- **Collection Permissions**: Control who can view/edit collections
- **Collection Sync**: Keep collections in sync across devices

### Performance Considerations
- **Lazy Loading**: Load tags and collections on demand
- **Caching**: Cache frequently accessed organization data
- **Debounced Updates**: Batch tag and collection operations
- **Optimistic Updates**: Update UI immediately for better UX

## 🧪 Testing Checklist
- [ ] Test tag creation, editing, and deletion
- [ ] Test tag autocomplete and suggestions
- [ ] Test collection creation and item management
- [ ] Test favorites functionality across all content types
- [ ] Test bulk organization operations
- [ ] Test organization persistence across sessions
- [ ] Test organization with large datasets
- [ ] Test mobile organization interface

## 🎨 User Experience Requirements

### Visual Design
- **Color-coded Tags**: Visual distinction between tag categories
- **Drag and Drop**: Intuitive organization through drag operations
- **Visual Hierarchy**: Clear organization structure display
- **Consistent Icons**: Standard iconography for organization actions

### Interaction Design
- **Quick Actions**: One-click favoriting and tagging
- **Bulk Selection**: Checkbox interface for multiple items
- **Contextual Menus**: Right-click organization options
- **Keyboard Shortcuts**: Power user keyboard navigation

### Organization Workflows
1. **Quick Tagging**: Select content → Add tags → Save
2. **Collection Building**: Create collection → Add content → Organize
3. **Bulk Organization**: Select multiple → Apply tags/collections/status
4. **Discovery**: Browse by tags → Find related content → Organize further

## 📱 Mobile Considerations
- Touch-optimized tag selection interface
- Swipe gestures for quick favoriting
- Simplified organization menu for mobile
- Touch-friendly drag and drop for collections
- Mobile-specific organization shortcuts

## 🔍 Organization Analytics
- **Tag Usage**: Most popular tags and tag combinations
- **Collection Activity**: Most accessed and valuable collections
- **Organization Patterns**: How users organize different content types
- **Search Behavior**: How organization affects content discovery

## 🚀 Future Enhancements
- **AI-Powered Tagging**: Automatic tag suggestions based on content
- **Smart Collections**: Collections that auto-update based on criteria
- **Collaborative Organization**: Share tags and collections with team members
- **Organization Templates**: Pre-made organization schemes for different use cases
- **Cross-Platform Sync**: Sync organization across multiple devices/accounts