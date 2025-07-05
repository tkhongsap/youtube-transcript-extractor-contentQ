# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Optimization
- Use sub-agents to run parallel tasks when it is possible so we can speed up the process and execution times.

## Project Overview

**Content Spark AI** - Full-stack video content processing and educational content generation platform.

**Technology Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express + TypeScript (ESM)
- Database: PostgreSQL + Drizzle ORM
- Authentication: Passport.js with session management
- External APIs: OpenAI 4.98.0, YouTube transcript extraction

## Common Development Commands

### Development
```bash
npm run dev          # Start development server (NODE_ENV=development)
npm run build        # Build client and server for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

### Server Management
- Always kill existing servers before starting new ones
- Server runs on port 5000 serving both API and client
- After making changes, always restart the server for testing

## Code Architecture

### Directory Structure
```
/client/             # React frontend application
├── src/
│   ├── components/  # UI components (shadcn/ui library)
│   ├── pages/       # Route components
│   ├── hooks/       # Custom React hooks
│   └── lib/         # Utilities and query client

/server/             # Express backend
├── routers/         # Modular domain-specific routers
├── middleware/      # Centralized error handling
└── index.ts         # Server entry point

/shared/
└── schema.ts        # Database schema with Drizzle ORM
```

### Router Architecture
- Domain-driven modular structure in `/server/routers/`
- Each router handles a specific resource (auth, videos, reports, flashcards, ideas)
- Centralized error handling middleware
- All routers registered in `routers/index.ts`
- Authentication middleware applied consistently

### Database Schema
Well-structured PostgreSQL schema with entities:
- Users, Videos, Summaries, Reports, Flashcard Sets/Cards, Idea Sets/Ideas, Sessions
- Type-safe schemas with Zod validation
- Relational mapping between entities

## Development Patterns

### Code Quality Rules
- Always iterate on existing code rather than creating new implementations
- Keep files under 200-300 lines - refactor when exceeding this limit
- Avoid code duplication by checking for existing similar functionality
- Write thorough tests for all major functionality
- Never overwrite .env files without explicit confirmation

### Error Handling
- All route handlers must forward errors to middleware using `next(error)`
- Centralized error handling in `middleware/errorHandler.ts`
- Consistent error response formats across all endpoints

### State Management
- Frontend uses TanStack Query for server state
- React Context for theme and global UI state
- Wouter for lightweight routing

## Adding New Features

### New API Endpoints
1. Identify appropriate router file based on domain
2. Add route with proper authentication and error handling
3. Follow existing patterns for validation and response formatting
4. Test thoroughly after server restart

### New React Components
1. Check existing components in `/client/src/components/`
2. Follow shadcn/ui patterns and conventions
3. Use existing hooks and utilities from `/client/src/hooks/` and `/client/src/lib/`
4. Maintain responsive design with Tailwind CSS

### Database Changes
1. Update schema in `/shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Update TypeScript types accordingly

## Environment Configuration
- Development: `NODE_ENV=development` with tsx for TypeScript execution
- Production: `NODE_ENV=production` with compiled JavaScript
- Database connection via environment variables
- OpenAI API key required for content generation features

## Testing and Deployment
- Project optimized for Replit deployment
- Custom Vite plugins for development experience
- ESBuild for server bundling
- Real-time error overlay in development mode