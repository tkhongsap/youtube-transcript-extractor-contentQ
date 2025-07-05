# Content Spark AI - Video Content Processing Platform

## Overview

Content Spark AI is a full-stack web application that transforms YouTube videos into valuable content assets using AI-powered transcription, summarization, and content generation. The platform enables users to extract transcripts, generate summaries, create reports, build flashcards, and mine content ideas from video content.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, modern UI
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite with custom configuration for alias resolution and asset handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript and ESM modules
- **Architecture Pattern**: Modular router structure with domain-specific endpoints
- **Authentication**: Passport.js with OpenID Connect (Replit Auth) and session management
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints with JSON responses and proper error handling

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **Schema Management**: Drizzle migrations with push-based deployment
- **Connection**: Serverless-optimized connection pooling via @neondatabase/serverless

## Key Components

### Authentication System
- **Provider**: Replit OpenID Connect integration
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Security**: HTTP-only cookies with secure settings in production
- **User Management**: Automatic user creation/update with profile data sync

### Video Processing Pipeline
1. **URL Validation**: YouTube URL parsing and video ID extraction
2. **Transcript Extraction**: Multiple fallback strategies for reliable transcript retrieval
3. **Content Storage**: Video metadata and transcripts stored in PostgreSQL
4. **AI Processing**: OpenAI GPT-4 integration for content generation

### Content Generation Engine
- **Summarization**: AI-powered video summaries with key topic extraction
- **Report Generation**: Medium-style and LinkedIn-style content creation
- **Flashcard Creation**: Educational flashcard sets with Q&A pairs
- **Idea Mining**: Blog title and social media hook generation

### Router Structure
```
/api/auth          - Authentication endpoints
/api/videos        - Video processing and management
/api/reports       - Report CRUD operations
/api/flashcard-sets - Flashcard management
/api/idea-sets     - Idea set management
/api/dev          - Development utilities
```

## Data Flow

### Video Processing Flow
1. User submits YouTube URL
2. System extracts video ID and validates URL
3. YouTube API fetches video metadata (title, channel, thumbnail)
4. Transcript extraction using youtube-transcript library with fallbacks
5. Video and transcript data stored in database
6. AI summary generation triggered asynchronously
7. User can generate additional content (reports, flashcards, ideas)

### Content Generation Flow
1. User requests content generation for processed video
2. System retrieves stored transcript from database
3. OpenAI API called with specific prompts for content type
4. Generated content stored with relationship to source video
5. Content displayed to user with options for copying/editing

### Authentication Flow
1. User redirected to Replit OAuth provider
2. Authorization code exchanged for tokens
3. User profile created/updated in database
4. Session established with secure cookie
5. Subsequent requests authenticated via session middleware

## External Dependencies

### Core Services
- **OpenAI API**: GPT-4 models for content generation and summarization
- **YouTube Services**: Video metadata and transcript extraction
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: OpenID Connect authentication provider

### Key Libraries
- **youtube-transcript**: Reliable transcript extraction with multiple strategies
- **drizzle-orm**: Type-safe database operations and migrations
- **passport.js**: Authentication middleware and strategy management
- **openai**: Official OpenAI API client for content generation

### Development Tools
- **TypeScript**: Full-stack type safety and development experience
- **Vite**: Fast development server and optimized production builds
- **shadcn/ui**: Pre-built accessible component library
- **TanStack Query**: Server state management and caching

## Deployment Strategy

### Build Process
1. Client build: Vite compiles React app with TypeScript type checking
2. Server build: esbuild bundles Node.js server with external package references
3. Database: Drizzle push command synchronizes schema changes
4. Static assets: Client build output served by Express in production

### Environment Configuration
- **Development**: Hot reload with Vite middleware integration
- **Production**: Static file serving with optimized builds
- **Database**: Environment-based connection strings with SSL
- **Authentication**: Configurable OAuth endpoints and session secrets

### Server Management
- Single process serving both API and static content on port 5000
- Graceful error handling with centralized middleware
- Request logging and performance monitoring
- Session persistence across server restarts

## Changelog
- July 05, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.