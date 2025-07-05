# Issue: Implement Missing Frontend Pages and Fix Broken Navigation

## 🏷️ Labels
`enhancement`, `frontend`, `ui/ux`, `navigation`, `high-priority`

## 📋 Summary
Critical frontend pages are missing, causing broken navigation links in the sidebar and mobile menu. Users cannot access dedicated views for their content libraries, resulting in poor user experience and limited functionality.

## 🔍 Problem Description
**Current Broken Navigation:**
- Sidebar links to `/videos`, `/reports`, `/flashcards`, `/ideas` return 404 errors
- Mobile bottom navigation has placeholder `href="#"` links
- Users can only access content through the dashboard or video detail pages
- No dedicated content management interfaces

**Files with Broken Links:**
- `/client/src/components/layout/Sidebar.tsx` - Navigation menu
- `/client/src/components/layout/AppLayout.tsx` - Mobile navigation

## ✅ Acceptance Criteria

### New Pages to Implement

#### 1. Videos Library Page (`/videos`)
- [ ] Display all user videos in a grid/list view
- [ ] Search and filter functionality (by title, date, channel)
- [ ] Sort options (newest, oldest, alphabetical)
- [ ] Video action menu (view details, delete, reprocess)
- [ ] Upload/process new video button
- [ ] Empty state for users with no videos
- [ ] Pagination for large video collections

#### 2. Reports Manager Page (`/reports`)
- [ ] List all user reports across all videos
- [ ] Filter by type (Medium articles, LinkedIn posts)
- [ ] Search within report content
- [ ] Report preview cards with edit/delete actions
- [ ] Export options (individual or bulk)
- [ ] Group by source video option
- [ ] Empty state with call-to-action

#### 3. Flashcards Study Page (`/flashcards`)
- [ ] Display all flashcard sets
- [ ] Study mode for individual sets
- [ ] Progress tracking and statistics
- [ ] Filter by video source or difficulty
- [ ] Bulk study mode across multiple sets
- [ ] Study session history
- [ ] Achievement system (cards studied, streaks)

#### 4. Ideas Hub Page (`/ideas`)
- [ ] Categorized view of all ideas (blog titles, social hooks, questions)
- [ ] Copy-to-clipboard functionality
- [ ] Favorite ideas system
- [ ] Export ideas to different formats
- [ ] Search across all idea types
- [ ] Organize by source video
- [ ] Bulk operations (select multiple, export, delete)

### Navigation Fixes
- [ ] Update all navigation links to point to real pages
- [ ] Implement proper active state highlighting
- [ ] Fix mobile navigation placeholder links
- [ ] Add breadcrumb navigation for nested pages
- [ ] Ensure consistent navigation across all pages

### Shared Components Needed
- [ ] `ContentCard` - Reusable card for different content types
- [ ] `SearchAndFilter` - Common search/filter component
- [ ] `BulkActions` - Select multiple items interface
- [ ] `EmptyState` - Consistent empty state messaging
- [ ] `ExportModal` - Export options dialog

## 🛠️ Technical Requirements

### Page Structure
```
/client/src/pages/
├── videos/
│   ├── index.tsx          # Videos library page
│   └── [id]/
│       └── index.tsx      # Individual video page (existing)
├── reports/
│   ├── index.tsx          # Reports manager page
│   └── [id].tsx           # Individual report viewer
├── flashcards/
│   ├── index.tsx          # Flashcards overview page
│   ├── [setId]/
│   │   ├── index.tsx      # Flashcard set viewer
│   │   └── study.tsx      # Study mode
└── ideas/
    ├── index.tsx          # Ideas hub page
    └── [setId].tsx        # Individual idea set viewer
```

### Data Fetching Patterns
```typescript
// Use TanStack Query for all data fetching
const useVideos = () => {
  return useQuery({
    queryKey: ['videos'],
    queryFn: () => api.get('/api/videos'),
  });
};

const useReports = (filters?: FilterOptions) => {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => api.get('/api/reports', { params: filters }),
  });
};
```

### URL Structure and Routing
```typescript
// Routing structure using Wouter
/videos                    # Videos library
/videos/:id               # Video detail (existing)
/reports                  # All reports
/reports/:id              # Individual report
/flashcards               # All flashcard sets
/flashcards/:setId        # Flashcard set view
/flashcards/:setId/study  # Study mode
/ideas                    # Ideas hub
/ideas/:setId             # Individual idea set
```

## 📁 Files to Create/Modify

### New Files
- `/client/src/pages/videos/index.tsx`
- `/client/src/pages/reports/index.tsx`
- `/client/src/pages/reports/[id].tsx`
- `/client/src/pages/flashcards/index.tsx`
- `/client/src/pages/flashcards/[setId]/index.tsx`
- `/client/src/pages/flashcards/[setId]/study.tsx`
- `/client/src/pages/ideas/index.tsx`
- `/client/src/pages/ideas/[setId].tsx`

### Shared Components
- `/client/src/components/common/ContentCard.tsx`
- `/client/src/components/common/SearchAndFilter.tsx`
- `/client/src/components/common/BulkActions.tsx`
- `/client/src/components/common/EmptyState.tsx`
- `/client/src/components/common/ExportModal.tsx`

### Modified Files
- `/client/src/components/layout/Sidebar.tsx` - Fix navigation links
- `/client/src/components/layout/AppLayout.tsx` - Fix mobile navigation
- `/client/src/App.tsx` - Add new routes

## 🔗 Related Issues
- Depends on: Missing CRUD API endpoints
- Enables: Complete user content management workflow
- Related to: Search and filtering system
- Related to: Content export functionality

## 💡 Implementation Notes

### Design Consistency
- Follow existing design patterns from dashboard and video detail pages
- Use shadcn/ui components consistently
- Maintain responsive design for mobile users
- Follow existing color scheme and typography

### Performance Considerations
- Implement virtual scrolling for large content lists
- Use proper pagination to avoid loading too much data
- Implement skeleton loading states
- Cache API responses with TanStack Query

### User Experience
- Provide clear empty states with actionable guidance
- Implement search with debounced input
- Add keyboard shortcuts for power users
- Ensure fast navigation between pages

### Accessibility
- Proper heading hierarchy for screen readers
- Keyboard navigation support
- ARIA labels for interactive elements
- Focus management for modals and overlays

## 🧪 Testing Checklist
- [ ] Test all navigation links work correctly
- [ ] Test responsive design on mobile devices
- [ ] Test empty states for new users
- [ ] Test search and filtering functionality
- [ ] Test bulk operations
- [ ] Test keyboard navigation
- [ ] Test with screen readers
- [ ] Performance testing with large datasets

## 📱 Mobile Considerations
- Touch-friendly interface elements
- Swipe gestures for flashcard study mode
- Optimized layouts for small screens
- Bottom navigation accessibility
- Pull-to-refresh functionality

## 🎨 UI/UX Requirements
- Consistent loading states across all pages
- Clear visual hierarchy for content organization
- Intuitive icons and labeling
- Smooth transitions between states
- Progressive disclosure for complex features