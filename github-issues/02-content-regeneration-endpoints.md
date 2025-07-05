# Issue: Implement Individual Content Regeneration API Endpoints

## 🏷️ Labels
`enhancement`, `backend`, `api`, `ai-integration`, `high-priority`

## 📋 Summary
The frontend `GenerateContentGrid` component expects API endpoints to regenerate individual content types (reports, flashcards, ideas) but these endpoints don't exist. Currently using mock implementations with simulated delays.

## 🔍 Problem Description
**Current State:**
- `GenerateContentGrid` component has mock mutations (line 91-104 in `/client/src/pages/video-detail.tsx`)
- Users can't regenerate specific content types without reprocessing entire video
- No way to generate additional content variations

**Expected Endpoints (from frontend code):**
```typescript
// These endpoints are expected but don't exist
POST /api/videos/${videoId}/generate-report?type=medium
POST /api/videos/${videoId}/generate-report?type=linkedin  
POST /api/videos/${videoId}/generate-flashcards
POST /api/videos/${videoId}/generate-ideas?type=blog_titles
POST /api/videos/${videoId}/generate-ideas?type=social_media_hooks
POST /api/videos/${videoId}/generate-ideas?type=questions
```

## ✅ Acceptance Criteria

### Report Generation Endpoints
- [ ] `POST /api/videos/:id/generate-report?type=medium` 
  - Generate new Medium-style article
  - Return generated report data
  - Store in database with proper relationships
- [ ] `POST /api/videos/:id/generate-report?type=linkedin`
  - Generate new LinkedIn post
  - Handle character limits appropriately

### Flashcard Generation Endpoints  
- [ ] `POST /api/videos/:id/generate-flashcards`
  - Generate new set of flashcards
  - Allow specifying quantity (default: 10)
  - Return flashcard set with individual cards

### Ideas Generation Endpoints
- [ ] `POST /api/videos/:id/generate-ideas?type=blog_titles`
  - Generate blog title suggestions
- [ ] `POST /api/videos/:id/generate-ideas?type=social_media_hooks`
  - Generate social media hooks/captions
- [ ] `POST /api/videos/:id/generate-ideas?type=questions`
  - Generate follow-up questions

### Common Requirements
- [ ] Proper authentication and user ownership validation
- [ ] Rate limiting to prevent API abuse
- [ ] Background processing with status updates
- [ ] Error handling for AI generation failures
- [ ] Consistent response format

## 🛠️ Technical Requirements

### Request/Response Format
```typescript
// Request
POST /api/videos/:id/generate-report?type=medium
Headers: Authorization: Bearer <token>
Body: {
  regenerate?: boolean;  // true to replace existing
  options?: {
    length?: 'short' | 'medium' | 'long';
    tone?: 'professional' | 'casual' | 'academic';
  }
}

// Response
{
  success: true,
  data: {
    id: number,
    type: 'medium' | 'linkedin',
    title: string,
    content: string,
    createdAt: string,
    videoId: number
  }
}
```

### Background Processing
- Use existing OpenAI integration patterns from `/server/openai.ts`
- Implement proper error handling for AI failures
- Consider implementing job queue for heavy operations
- Return immediate response with processing status

### Database Considerations
- Reuse existing table structures (reports, flashcardSets, ideaSets)
- Handle duplicate generation (replace or create new?)
- Maintain foreign key relationships
- Track generation metadata (prompt used, model version, etc.)

## 📁 Files to Modify
- `/server/routers/videos.router.ts` - Add new endpoints
- `/server/openai.ts` - Ensure functions can be called individually
- `/client/src/pages/video-detail.tsx` - Replace mock implementations

## 🔗 Related Issues
- Depends on: OpenAI integration improvements
- Enables: Real-time content regeneration UI
- Related to: Content versioning system

## 💡 Implementation Notes

### Reuse Existing OpenAI Functions
```typescript
// These functions already exist in /server/openai.ts
- generateVideoSummary()
- generateMediumReport() 
- generateLinkedInPost()
- generateFlashcards()
- generateBlogIdeas()
- generateSocialMediaHooks()
- generateFollowUpQuestions()
```

### Rate Limiting Strategy
- Implement per-user rate limits (e.g., 10 generations per hour)
- Track usage in database or Redis
- Return clear error messages when limits exceeded

### Error Handling
- Handle OpenAI API failures gracefully
- Provide meaningful error messages to users
- Log failures for debugging
- Implement retry logic for transient failures

## 🧪 Testing Checklist
- [ ] Test all endpoint variations with valid videos
- [ ] Test with invalid video IDs and unauthorized access
- [ ] Test rate limiting functionality
- [ ] Test OpenAI integration edge cases
- [ ] Integration test with frontend GenerateContentGrid
- [ ] Load testing for concurrent generations

## 📈 Success Metrics
- `GenerateContentGrid` component uses real API calls
- Users can regenerate content without full video reprocessing
- Reduced OpenAI API costs through targeted generation
- Improved user satisfaction with content quality control