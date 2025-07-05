# Issue: Implement Video Management and User Profile CRUD Operations

## 🏷️ Labels
`enhancement`, `backend`, `api`, `user-management`, `high-priority`

## 📋 Summary
Critical user management operations are missing, including video deletion, user profile updates, and proper user data management. Users cannot clean up their content or manage their account properly.

## 🔍 Problem Description
**Current State:**
- Videos can be created but never deleted
- User profiles cannot be updated after creation
- No user preferences or settings management
- No way to manage user's content library
- Potential data accumulation and storage issues

**Impact:**
- Users accumulate unwanted video data
- No account management capabilities
- Poor user experience for long-term users
- Potential storage and cost issues

## ✅ Acceptance Criteria

### Video Management
- [ ] `DELETE /api/videos/:id` - Delete video and all associated content
  - Remove video record from database
  - Cascade delete all related content (summaries, reports, flashcards, ideas)
  - Implement soft delete with recovery option
  - Proper authorization checks
- [ ] `PUT /api/videos/:id` - Update video metadata
  - Update title, description, custom tags
  - Mark as favorite/unfavorite
  - Update processing status if needed
- [ ] `POST /api/videos/:id/reprocess` - Reprocess video with new settings
  - Regenerate transcript if needed
  - Update all derived content

### User Profile Management
- [ ] `GET /api/users/:id` - Get user profile (own profile only)
- [ ] `PUT /api/users/:id` - Update user profile
  - Update name, email, preferences
  - Validate email uniqueness
  - Handle profile picture uploads
- [ ] `DELETE /api/users/:id` - Delete user account
  - Implement account deletion with confirmation
  - Cascade delete all user data
  - Provide data export option before deletion

### User Preferences & Settings
- [ ] `GET /api/users/:id/preferences` - Get user preferences
- [ ] `PUT /api/users/:id/preferences` - Update user preferences
  - Theme settings (dark/light mode)
  - Notification preferences
  - Content generation preferences (tone, length, etc.)
  - Privacy settings

### Content Statistics
- [ ] `GET /api/users/:id/stats` - Get user content statistics
  - Total videos processed
  - Total content items generated
  - Storage usage
  - API usage statistics

## 🛠️ Technical Requirements

### Database Schema Updates
```typescript
// Add to users table
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    processing_complete: boolean;
    weekly_summary: boolean;
  };
  content_defaults: {
    report_tone: 'professional' | 'casual' | 'academic';
    report_length: 'short' | 'medium' | 'long';
    flashcard_count: number;
    idea_count: number;
  };
  privacy: {
    profile_public: boolean;
    content_searchable: boolean;
  };
}

// Add to videos table
interface VideoMetadata {
  is_favorite: boolean;
  custom_tags: string[];
  view_count: number;
  last_accessed: Date;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
}
```

### Cascade Delete Implementation
```typescript
// When deleting video, also delete:
- All summaries for the video
- All reports for the video  
- All flashcard sets and their flashcards
- All idea sets and their ideas
- Any associated files or media
```

### Soft Delete vs Hard Delete
- **Videos**: Soft delete with 30-day recovery period
- **User accounts**: Hard delete with confirmation and data export
- **Content items**: Follow parent video delete policy

### Authorization & Security
- Users can only manage their own data
- Admin users can manage any data (future consideration)
- Implement proper authentication checks
- Log all deletion operations for audit

## 📁 Files to Modify
- `/server/routers/videos.router.ts` - Add video management endpoints
- `/server/routers/auth.router.ts` - Add user profile endpoints  
- `/shared/schema.ts` - Add preferences and metadata schemas
- Add new `/server/routers/users.router.ts` if needed

## 🔗 Related Issues
- Enables: User settings page implementation
- Enables: Video library management UI
- Depends on: Database cascade delete setup
- Related to: Content organization features

## 💡 Implementation Notes

### Soft Delete Implementation
```typescript
// Add to video schema
deleted_at?: Date;
deleted_by?: string;

// Filter deleted videos from queries
const activeVideos = videos.filter(v => !v.deleted_at);
```

### User Data Export
- Provide JSON export of all user data before account deletion
- Include videos, transcripts, generated content
- Follow GDPR compliance requirements
- Async generation with download link

### Error Handling
- Graceful handling of foreign key constraints
- Clear error messages for deletion failures
- Rollback support for partial deletion failures
- Audit logging for all management operations

## 🧪 Testing Checklist
- [ ] Test video deletion with all content types
- [ ] Test soft delete and recovery functionality
- [ ] Test user profile update validation
- [ ] Test cascade delete operations
- [ ] Test authorization for cross-user access
- [ ] Test data export functionality
- [ ] Integration tests with frontend components

## 📋 Database Migration Plan
1. Add new columns to existing tables
2. Set default values for existing records
3. Update foreign key constraints for cascade deletes
4. Create indexes for new query patterns
5. Test migration on copy of production data

## 🚨 Considerations
- **Data Privacy**: Ensure complete data removal for GDPR compliance
- **Performance**: Large cascade deletes may need background processing
- **Recovery**: Implement proper backup/recovery for accidental deletions
- **Audit**: Log all management operations for compliance