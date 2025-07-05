# Issue: Implement Content Editing and Management Interface

## 🏷️ Labels
`enhancement`, `frontend`, `ui/ux`, `content-management`, `high-priority`

## 📋 Summary
Users cannot edit generated content after creation. The video detail page shows stub implementations for Reports, Flashcards, and Ideas tabs. Content cards have edit menu items that don't function. This creates a poor user experience where users are stuck with initial AI-generated content.

## 🔍 Problem Description
**Current Issues:**
- Video detail page tabs show "will be implemented soon" placeholders (lines 139-156 in `/client/src/pages/video-detail.tsx`)
- `ReportCard` and `FlashcardSetCard` components have non-functional edit buttons
- No way to modify AI-generated content to improve quality
- Users must regenerate entire content sets instead of making small edits

**Expected User Workflow:**
1. User views generated content
2. User identifies content that needs improvement
3. User clicks edit to modify content inline or in modal
4. User saves changes and sees updated content immediately

## ✅ Acceptance Criteria

### Video Detail Page Tab Implementation

#### Reports Tab
- [ ] Replace placeholder with functional reports viewer
- [ ] Display all reports for the video (Medium articles, LinkedIn posts)
- [ ] Show report previews with title, excerpt, and metadata
- [ ] Edit button opens report in editing interface
- [ ] Delete button with confirmation dialog
- [ ] Export/copy options for each report

#### Flashcards Tab  
- [ ] Replace placeholder with interactive flashcard interface
- [ ] Grid view of all flashcard sets for the video
- [ ] Click to expand set and view individual cards
- [ ] Inline editing for individual flashcards
- [ ] Add/remove cards from sets
- [ ] Study mode launcher
- [ ] Bulk edit operations

#### Ideas Tab
- [ ] Replace placeholder with organized ideas viewer
- [ ] Categorized display (Blog Titles, Social Media Hooks, Questions)
- [ ] Click to edit individual ideas
- [ ] Copy to clipboard functionality
- [ ] Favorite/unfavorite ideas
- [ ] Bulk export options

### Content Editing Interfaces

#### Report Editor
- [ ] Full-screen modal or dedicated page for editing
- [ ] Rich text editor with formatting options
- [ ] Title and content editing
- [ ] Real-time character count (especially for LinkedIn posts)
- [ ] Save/cancel/delete actions
- [ ] Version history (future consideration)
- [ ] Export options (Markdown, HTML, PDF)

#### Flashcard Editor
- [ ] Modal or inline editing for individual cards
- [ ] Question and answer text areas
- [ ] Add new cards to existing sets
- [ ] Reorder cards within sets
- [ ] Bulk edit operations (find/replace, formatting)
- [ ] Preview mode to test flashcards

#### Ideas Editor
- [ ] Inline editing for individual ideas
- [ ] Batch editing for multiple ideas
- [ ] Add new ideas to existing sets
- [ ] Change idea categories
- [ ] Duplicate ideas with modifications

### Common Editing Features
- [ ] Auto-save functionality to prevent data loss
- [ ] Undo/redo operations
- [ ] Validation and error handling
- [ ] Loading states during save operations
- [ ] Optimistic updates for better UX

## 🛠️ Technical Requirements

### Component Architecture
```typescript
// Shared editing components
interface EditableContent {
  id: number;
  type: 'report' | 'flashcard' | 'idea';
  content: string;
  metadata: Record<string, any>;
}

// Editor component props
interface ContentEditorProps {
  content: EditableContent;
  onSave: (updated: EditableContent) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  readOnly?: boolean;
}
```

### Rich Text Editor Integration
```typescript
// Consider using react-quill or similar for rich text editing
import ReactQuill from 'react-quill';

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    ['link', 'blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ],
};
```

### State Management
```typescript
// Use TanStack Query mutations for updates
const useUpdateReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (report: UpdateReportRequest) => 
      api.put(`/api/reports/${report.id}`, report),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['videos']);
    },
  });
};
```

### Form Validation
```typescript
// Use Zod schemas for validation
const reportEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(10, 'Content too short'),
  type: z.enum(['medium', 'linkedin']),
});
```

## 📁 Files to Create/Modify

### New Components
- `/client/src/components/content/ReportEditor.tsx`
- `/client/src/components/content/FlashcardEditor.tsx`
- `/client/src/components/content/IdeaEditor.tsx`
- `/client/src/components/content/ContentEditDialog.tsx`
- `/client/src/components/content/BulkEditDialog.tsx`

### Modified Files
- `/client/src/pages/video-detail.tsx` - Replace tab placeholders
- `/client/src/components/ReportCard.tsx` - Connect edit functionality
- `/client/src/components/FlashcardSetCard.tsx` - Connect edit functionality
- `/client/src/components/IdeaSetCard.tsx` - Connect edit functionality

### Tab Implementation Components
- `/client/src/components/video-detail/ReportsTab.tsx`
- `/client/src/components/video-detail/FlashcardsTab.tsx`
- `/client/src/components/video-detail/IdeasTab.tsx`

## 🔗 Related Issues
- Depends on: Missing CRUD API endpoints (#1)
- Enables: Complete content management workflow
- Related to: Content versioning and history
- Related to: Export and sharing functionality

## 💡 Implementation Notes

### Auto-save Strategy
- Debounce save operations (500ms delay)
- Show save status indicator
- Handle offline scenarios gracefully
- Recover unsaved changes on page reload

### Performance Considerations
- Lazy load rich text editor components
- Virtualize large lists of content items
- Implement proper memoization for expensive operations
- Use React.memo for frequently re-rendered components

### User Experience
- Provide clear feedback for all actions
- Implement keyboard shortcuts (Ctrl+S for save, Ctrl+Z for undo)
- Show character limits for platforms with restrictions
- Provide templates or suggestions for improvements

### Error Handling
- Handle network failures gracefully
- Show specific error messages for validation failures
- Provide retry mechanisms for failed saves
- Maintain local state during error recovery

## 🧪 Testing Checklist
- [ ] Test inline editing functionality
- [ ] Test modal/dialog editing interfaces
- [ ] Test auto-save behavior
- [ ] Test form validation and error states
- [ ] Test with large content datasets
- [ ] Test concurrent editing scenarios
- [ ] Test offline behavior
- [ ] Accessibility testing for all editing interfaces

## 🎨 Design Requirements

### Visual Design
- Consistent with existing app design language
- Clear visual distinction between view and edit modes
- Intuitive editing controls and toolbars
- Proper spacing and typography in editors

### Interaction Design
- Smooth transitions between view and edit modes
- Clear save/cancel/delete confirmation flows
- Responsive design for mobile editing
- Touch-friendly controls for mobile devices

### Content Presentation
- Syntax highlighting for code blocks
- Preview mode for formatted content
- Word/character count displays
- Progress indicators for long operations

## 📱 Mobile Considerations
- Touch-optimized editing controls
- Virtual keyboard handling
- Simplified editing interface for mobile
- Gesture support for common operations
- Consideration for limited screen space

## 🔒 Security Considerations
- Validate all user input on both client and server
- Sanitize HTML content to prevent XSS
- Implement proper authorization checks
- Rate limiting for save operations
- Audit logging for content modifications