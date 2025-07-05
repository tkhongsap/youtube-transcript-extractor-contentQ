# Issue: Implement Missing CRUD Operations for Content Management

## 🏷️ Labels
`enhancement`, `backend`, `api`, `high-priority`

## 📋 Summary
The application currently lacks essential CRUD (Create, Read, Update, Delete) operations for managing user-generated content. Users cannot edit, delete, or individually retrieve reports, flashcards, and ideas after they're generated.

## 🔍 Problem Description
**Current State:**
- Content can only be created through the video processing pipeline
- No way to edit generated content (reports, flashcards, ideas)
- No way to delete individual content items
- No endpoints to retrieve individual content items
- Users are stuck with initially generated content

**Impact:**
- Poor user experience - can't refine generated content
- No content lifecycle management
- Wasted AI generation quota when content needs tweaking

## ✅ Acceptance Criteria

### Reports Management
- [ ] `GET /api/reports/:id` - Retrieve individual report
- [ ] `PUT /api/reports/:id` - Update report content and metadata
- [ ] `DELETE /api/reports/:id` - Delete individual report
- [ ] Add validation for report updates

### Flashcards Management
- [ ] `GET /api/flashcard-sets/:id` - Retrieve individual flashcard set
- [ ] `PUT /api/flashcard-sets/:id` - Update flashcard set metadata
- [ ] `DELETE /api/flashcard-sets/:id` - Delete entire flashcard set
- [ ] `PUT /api/flashcards/:id` - Update individual flashcard
- [ ] `DELETE /api/flashcards/:id` - Delete individual flashcard

### Ideas Management
- [ ] `GET /api/idea-sets/:id` - Retrieve individual idea set
- [ ] `PUT /api/idea-sets/:id` - Update idea set metadata
- [ ] `DELETE /api/idea-sets/:id` - Delete entire idea set
- [ ] `PUT /api/ideas/:id` - Update individual idea
- [ ] `DELETE /api/ideas/:id` - Delete individual idea

### Database Operations
- [ ] Implement corresponding database functions in each router file
- [ ] Add proper error handling for not found cases
- [ ] Add validation schemas using Zod
- [ ] Ensure proper user ownership checks

## 🛠️ Technical Requirements

### Database Schema Updates
```typescript
// Add these fields to existing entities for better management
- reports: add `editCount`, `lastModified`
- flashcards: add `lastModified`
- ideas: add `lastModified`
```

### API Response Format
```typescript
// Standardize response format for all endpoints
{
  success: boolean;
  data: T | null;
  message?: string;
  error?: string;
}
```

### Error Handling
- Return 404 for non-existent resources
- Return 403 for unauthorized access to other users' content
- Return 400 for validation errors
- Consistent error message format

## 📁 Files to Modify
- `/server/routers/reports.router.ts`
- `/server/routers/flashcards.router.ts` 
- `/server/routers/ideas.router.ts`
- `/shared/schema.ts` (if schema updates needed)

## 🔗 Related Issues
- Will enable: Content editing UI implementation
- Will enable: Content management dashboard
- Depends on: Database integrity improvements

## 💡 Implementation Notes
- Follow existing patterns in `/server/routers/videos.router.ts`
- Use existing middleware for authentication
- Implement optimistic locking for concurrent edits
- Consider soft deletes for content recovery

## 🧪 Testing Checklist
- [ ] Unit tests for all new endpoints
- [ ] Integration tests for CRUD workflows
- [ ] Test error cases (unauthorized, not found, validation)
- [ ] Test with existing frontend components