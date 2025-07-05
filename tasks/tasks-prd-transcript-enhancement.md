# Task List: Transcript Enhancement Feature

Based on PRD: `prd-transcript-enhancement.md`

## Relevant Files

### Client-side Files
- `client/src/types/transcript.ts` - TypeScript interfaces for transcript and enhancement data
- `client/src/types/transcript.test.ts` - Unit tests for type definitions and validation
- `client/src/test/setup.ts` - Test setup configuration for Vitest
- `vitest.config.ts` - Vitest configuration file
- `client/src/components/TranscriptEnhancement.tsx` - Main component for the transcript enhancement UI
- `client/src/components/TranscriptEnhancement.test.tsx` - Unit tests for the transcript enhancement component
- `client/src/components/AdditionalTextInput.tsx` - Component for the additional text input area
- `client/src/components/AdditionalTextInput.test.tsx` - Unit tests for the additional text input component
- `client/src/lib/transcriptService.ts` - Service for handling transcript data and enhancement logic
- `client/src/lib/transcriptService.test.ts` - Unit tests for transcript service
- `client/src/styles/transcriptEnhancement.css` - Styling for visual distinction between original and added text
- `client/src/hooks/useAdditionalTextState.ts` - Custom hook for managing additional text input state
- `client/src/hooks/useAdditionalTextState.test.ts` - Unit tests for the additional text state hook
- `client/src/hooks/useTranscriptEnhancement.ts` - Custom hook for managing transcript enhancement state
- `client/src/hooks/useTranscriptEnhancement.test.ts` - Unit tests for the enhancement hook

### Server-side Files
- `shared/schema.ts` - Database schema including additional_texts table and types
- `server/storage.ts` - Database operations for additional text CRUD
- `server/routers/additionalText.router.ts` - API endpoints for additional text management
- `server/routers/index.ts` - Router registration including additional text routes
- `server/routers/videos.router.ts` - Enhanced AI processing endpoints
- `server/transcriptEnhancement.ts` - Utility functions for enhanced transcript processing
- `server/openai.ts` - Enhanced AI functions for processing with additional text context

### Integration Tests
- `server/tests/transcriptEnhancement.integration.test.ts` - Comprehensive server-side integration tests
- `server/tests/transcriptEnhancement.simple.test.ts` - Focused integration tests for core functionality
- `client/src/tests/transcriptEnhancement.integration.test.tsx` - Client-side integration tests for UI workflow

### Notes

- Unit tests should typically be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration
- Consider the existing codebase structure when implementing these files

## Tasks

- [x] 1.0 Set up data models and types for transcript enhancement
  - [x] 1.1 Create TypeScript interfaces for original transcript data structure
  - [x] 1.2 Define interface for additional text entries (content, timestamp, label)
  - [x] 1.3 Create enhanced transcript type that combines original and additional text
  - [x] 1.4 Add validation schemas for additional text input
  - [x] 1.5 Write unit tests for type definitions and validation

- [x] 2.0 Create UI components for additional text input
  - [x] 2.1 Build AdditionalTextInput component with textarea and label
  - [x] 2.2 Implement character count display and optional limits
  - [x] 2.3 Add save/cancel buttons with proper state management
  - [x] 2.4 Create TranscriptEnhancement wrapper component
  - [x] 2.5 Implement responsive design for mobile and desktop
  - [x] 2.6 Add accessibility features (ARIA labels, keyboard navigation)
  - [x] 2.7 Write unit tests for all UI components

- [x] 3.0 Implement visual distinction between original and enhanced text
  - [x] 3.1 Create CSS classes for original transcript styling
  - [x] 3.2 Design contrasting styles for additional text sections
  - [x] 3.3 Implement clear labeling system ("Original" vs "Additional Notes")
  - [x] 3.4 Add visual indicators (borders, background colors, icons)
  - [x] 3.5 Ensure proper color contrast for accessibility compliance
  - [x] 3.6 Test visual distinction across different themes/modes

- [x] 4.0 Build save functionality and data persistence
  - [x] 4.1 Create transcriptService functions for saving additional text
  - [x] 4.2 Implement auto-save functionality with debouncing
  - [x] 4.3 Add manual save option with confirmation feedback
  - [x] 4.4 Create data structure to store both original and enhanced versions
  - [x] 4.5 Implement error handling for save operations
  - [x] 4.6 Add loading states and user feedback during save operations
  - [x] 4.7 Write unit tests for save functionality and error scenarios

- [x] 5.0 Integrate enhanced transcripts with downstream AI processing
  - [x] 5.1 Create text merging logic to combine original and additional text
  - [x] 5.2 Update AI processing pipeline to use enhanced transcripts
  - [x] 5.3 Modify summary generation to include additional text context
  - [x] 5.4 Update report generation to incorporate enhanced content
  - [x] 5.5 Add configuration option to use original vs enhanced transcripts
  - [x] 5.6 Implement proper error handling for AI processing failures
  - [x] 5.7 Write integration tests for AI processing with enhanced transcripts 