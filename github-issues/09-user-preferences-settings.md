# Issue: Implement User Profile and Settings Management

## 🏷️ Labels
`enhancement`, `frontend`, `backend`, `user-management`, `settings`, `medium-priority`

## 📋 Summary
Users cannot manage their profile information, preferences, or account settings. The application lacks essential user management features like profile updates, preferences, theme settings, and account controls.

## 🔍 Problem Description
**Current Gaps:**
- No user profile page or editing capabilities
- No theme switching (dark/light mode preferences)
- No notification preferences or email settings
- No content generation preferences (tone, length, etc.)
- No account management (password change, account deletion)
- No privacy settings or data control options

**User Needs:**
- Update profile information and avatar
- Set content generation preferences to match their style
- Control notifications and email communications
- Manage account security and privacy
- Set application preferences for better UX

## ✅ Acceptance Criteria

### User Profile Management
- [ ] **Profile page** - View and edit user information
- [ ] **Profile picture upload** - Avatar image with crop/resize
- [ ] **Basic info editing** - Name, email, bio, location
- [ ] **Profile privacy settings** - Control profile visibility
- [ ] **Account statistics** - Usage stats, content generated, join date

### Application Preferences
- [ ] **Theme settings** - Light, dark, or system preference
- [ ] **Language settings** - UI language selection
- [ ] **Timezone settings** - User's timezone for date/time display
- [ ] **Accessibility options** - Font size, high contrast, motion preferences
- [ ] **Interface preferences** - Sidebar collapsed, default page, etc.

### Content Generation Preferences
- [ ] **Default content tone** - Professional, casual, academic
- [ ] **Default content length** - Short, medium, long for reports
- [ ] **Default flashcard count** - Preferred number of flashcards per set
- [ ] **Default idea count** - Preferred number of ideas per set
- [ ] **AI model preferences** - Choose preferred AI models (if multiple available)
- [ ] **Content templates** - Save custom templates for content generation

### Notification Preferences
- [ ] **Email notifications** - Toggle email notifications on/off
- [ ] **Processing completion alerts** - Notify when video processing completes
- [ ] **Weekly summaries** - Email digest of activity and new content
- [ ] **Feature announcements** - Updates about new features
- [ ] **Marketing communications** - Promotional emails and tips

### Account Security
- [ ] **Password change** - Update account password
- [ ] **Email change** - Update email with verification
- [ ] **Two-factor authentication** - Enable/disable 2FA
- [ ] **Active sessions** - View and revoke active login sessions
- [ ] **Account deletion** - Delete account with confirmation and data export

### Privacy and Data Controls
- [ ] **Data export** - Download all user data in JSON format
- [ ] **Content visibility** - Control who can see user's content
- [ ] **Analytics opt-out** - Disable usage analytics tracking
- [ ] **Data retention** - Control how long data is kept

## 🛠️ Technical Requirements

### Database Schema Extensions
```sql
-- User preferences table
CREATE TABLE user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(10) DEFAULT 'system', -- 'light', 'dark', 'system'
  language VARCHAR(5) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Content generation defaults
  default_report_tone VARCHAR(20) DEFAULT 'professional',
  default_report_length VARCHAR(10) DEFAULT 'medium',
  default_flashcard_count INTEGER DEFAULT 10,
  default_idea_count INTEGER DEFAULT 10,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  processing_notifications BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT false,
  feature_announcements BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  
  -- Privacy settings
  profile_public BOOLEAN DEFAULT false,
  analytics_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions for security management
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

### API Endpoints
```typescript
// Profile management
GET /api/users/me - Get current user profile
PUT /api/users/me - Update user profile
POST /api/users/me/avatar - Upload profile picture
DELETE /api/users/me/avatar - Remove profile picture

// Preferences
GET /api/users/me/preferences - Get user preferences
PUT /api/users/me/preferences - Update preferences
POST /api/users/me/preferences/reset - Reset to defaults

// Account security
PUT /api/users/me/password - Change password
PUT /api/users/me/email - Change email (with verification)
GET /api/users/me/sessions - Get active sessions
DELETE /api/users/me/sessions/:id - Revoke specific session
DELETE /api/users/me/sessions - Revoke all other sessions

// Data management
GET /api/users/me/export - Export user data
DELETE /api/users/me - Delete account
```

### Frontend Implementation

#### Settings Context
```typescript
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  contentDefaults: {
    reportTone: 'professional' | 'casual' | 'academic';
    reportLength: 'short' | 'medium' | 'long';
    flashcardCount: number;
    ideaCount: number;
  };
  notifications: {
    email: boolean;
    processing: boolean;
    weekly: boolean;
    announcements: boolean;
    marketing: boolean;
  };
  privacy: {
    profilePublic: boolean;
    analyticsEnabled: boolean;
  };
}

const SettingsContext = createContext<{
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
} | null>(null);
```

#### Theme System Integration
```typescript
const useTheme = () => {
  const { settings, updateSettings } = useSettings();
  
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });
    
    // Apply theme immediately
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  };
  
  return { theme: settings.theme, setTheme };
};
```

## 📁 Files to Create/Modify

### Backend Files
- `/server/routers/users.router.ts` - User profile and preferences endpoints
- `/server/routers/auth.router.ts` - Add security management endpoints
- `/server/middleware/preferences.middleware.ts` - Apply user preferences
- `/server/services/avatarService.ts` - Handle avatar uploads
- `/server/services/dataExportService.ts` - User data export

### Frontend Components
- `/client/src/pages/settings/index.tsx` - Main settings page
- `/client/src/pages/settings/profile.tsx` - Profile editing page
- `/client/src/pages/settings/preferences.tsx` - App preferences
- `/client/src/pages/settings/notifications.tsx` - Notification settings
- `/client/src/pages/settings/security.tsx` - Account security
- `/client/src/pages/settings/privacy.tsx` - Privacy and data controls

### Settings Components
- `/client/src/components/settings/SettingsLayout.tsx` - Settings page layout
- `/client/src/components/settings/ProfilePictureUpload.tsx`
- `/client/src/components/settings/ThemeSelector.tsx`
- `/client/src/components/settings/NotificationToggles.tsx`
- `/client/src/components/settings/PasswordChangeForm.tsx`
- `/client/src/components/settings/SessionManager.tsx`
- `/client/src/components/settings/DataExportDialog.tsx`
- `/client/src/components/settings/AccountDeletionDialog.tsx`

### Context and Hooks
- `/client/src/contexts/SettingsContext.tsx`
- `/client/src/hooks/useSettings.ts`
- `/client/src/hooks/useTheme.ts`
- `/client/src/hooks/useProfile.ts`

### Modified Files
- `/client/src/App.tsx` - Initialize settings context
- `/client/src/components/layout/Sidebar.tsx` - Add settings navigation
- `/client/src/components/layout/AppLayout.tsx` - Apply theme classes

## 🔗 Related Issues
- Enables: Better user experience customization
- Related to: Content organization preferences
- Future: Team and collaboration settings
- Future: Advanced AI model selection

## 💡 Implementation Notes

### Avatar Upload Strategy
```typescript
// Client-side image processing
const processAvatar = async (file: File) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  return new Promise((resolve) => {
    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      ctx.drawImage(img, 0, 0, 200, 200);
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
};
```

### Theme System Implementation
```css
/* CSS variables for theme system */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... other theme variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  /* ... dark theme variables */
}
```

### Security Considerations
- **Password Validation**: Strong password requirements
- **Email Verification**: Verify new email addresses before changing
- **Session Management**: Secure session token handling
- **Rate Limiting**: Prevent abuse of sensitive endpoints
- **Audit Logging**: Log all security-related actions

### Privacy Compliance
- **GDPR Compliance**: Right to data portability and deletion
- **Clear Consent**: Explicit consent for data processing
- **Data Minimization**: Only collect necessary data
- **Transparent Policies**: Clear privacy policy and terms

## 🧪 Testing Checklist
- [ ] Test profile editing and validation
- [ ] Test avatar upload and processing
- [ ] Test theme switching functionality
- [ ] Test preference persistence across sessions
- [ ] Test password change flow
- [ ] Test email change with verification
- [ ] Test session management
- [ ] Test data export functionality
- [ ] Test account deletion flow
- [ ] Test notification preference application

## 🎨 User Experience Requirements

### Settings Navigation
- **Sidebar Navigation**: Clear categorization of settings
- **Search in Settings**: Find specific settings quickly
- **Breadcrumb Navigation**: Show current settings section
- **Save Indicators**: Clear feedback on setting changes

### Form Design
- **Progressive Disclosure**: Show advanced options on demand
- **Inline Validation**: Real-time validation feedback
- **Auto-save**: Automatic saving of preferences
- **Reset Options**: Easy way to restore defaults

### Visual Feedback
- **Loading States**: Show progress during uploads/changes
- **Success Notifications**: Confirm successful changes
- **Error Handling**: Clear error messages and recovery options
- **Preview Mode**: Preview changes before applying

## 📱 Mobile Considerations
- Touch-friendly settings interface
- Optimized forms for mobile input
- Simplified navigation for smaller screens
- Mobile-appropriate file upload interface
- Consideration for mobile storage limitations

## 🔧 Performance Considerations
- **Lazy Loading**: Load settings sections on demand
- **Debounced Updates**: Batch preference changes
- **Image Optimization**: Compress uploaded avatars
- **Caching**: Cache user preferences locally
- **Minimal Reloads**: Update settings without page refresh

## 📊 Settings Analytics
- **Usage Patterns**: Which settings are most commonly changed
- **Theme Preferences**: Light vs dark mode adoption
- **Feature Adoption**: Which features users enable/disable
- **Support Insights**: Common settings-related support issues