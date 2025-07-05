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
- Authentication: OpenID Connect (Replit) with Passport.js
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

### Testing
```bash
npm run test         # Run tests in watch mode with Vitest
npm run test:run     # Run tests once with Vitest
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
- Each router handles a specific resource (auth, videos, reports, flashcards, ideas, additionalText, users, dev)
- Centralized error handling middleware in `routers/middleware/errorHandler.ts`
- Global error handler in `middleware/errorHandler.ts`
- All routers registered in `routers/index.ts` with `registerAppRoutes()`
- Authentication middleware (`isAuthenticated`) applied consistently
- All routes use `next(error)` pattern for error forwarding

### Database Schema
Well-structured PostgreSQL schema with entities:
- Users, Videos, Summaries, Reports, Flashcard Sets/Cards, Idea Sets/Ideas, Sessions, Additional Texts
- Type-safe schemas with Zod validation and drizzle-zod integration
- Relational mapping between entities with proper foreign keys
- User ownership verification pattern for all resources

### Authentication Architecture
- OpenID Connect strategy with Replit integration
- PostgreSQL session store using connect-pg-simple
- Access tokens with refresh token support
- Domain flexibility via `REPLIT_DOMAINS` environment variable
- User ID extraction from `req.user.claims.sub`
- Automatic token refresh in `isAuthenticated` middleware

## Development Patterns

### Code Quality Rules
- Always iterate on existing code rather than creating new implementations
- Keep files under 200-300 lines - refactor when exceeding this limit
- Avoid code duplication by checking for existing similar functionality
- Write thorough tests for all major functionality
- Never overwrite .env files without explicit confirmation
- Always look for existing patterns before creating new ones
- Focus only on areas relevant to the task
- Avoid mocking data in dev/prod environments (tests only)

### Error Handling
- All route handlers must forward errors to middleware using `next(error)`
- Two-tier error handling: router-level and global middleware
- ZodError handling with proper validation messages
- Development vs production error response differentiation
- Consistent error response formats across all endpoints

### State Management
- Frontend uses TanStack Query for server state with credentials
- React Context for theme and global UI state
- Wouter for lightweight routing
- React Hook Form with Zod validation for forms
- Custom hooks for complex state logic (auth, transcript enhancement, mobile gestures)

## Adding New Features

### New API Endpoints
1. Identify appropriate router file based on domain
2. Add route with proper authentication and error handling
3. Follow existing patterns for validation and response formatting
4. Test thoroughly after server restart

### New React Components
1. Check existing components in `/client/src/components/`
2. Follow shadcn/ui patterns and conventions (57+ components available)
3. Use existing hooks and utilities from `/client/src/hooks/` and `/client/src/lib/`
4. Maintain mobile-first responsive design with Tailwind CSS
5. Follow component organization: `/ui/` for shadcn components, `/layout/` for layout, `/content/` for features
6. Use Class Variance Authority (CVA) for component variants
7. Implement proper accessibility with ARIA attributes
8. Consider mobile interactions (touch gestures, virtual keyboard)

### Database Changes
1. Update schema in `/shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Update TypeScript types accordingly

## Environment Configuration
- Development: `NODE_ENV=development` with tsx for TypeScript execution
- Production: `NODE_ENV=production` with compiled JavaScript
- Database connection via environment variables
- OpenAI API key required for content generation features
- Replit authentication with `REPLIT_DOMAINS` support

## Testing Strategy
- Vitest with jsdom environment for React components
- React Testing Library for component testing
- Jest DOM matchers for assertions
- Test files co-located with components
- Custom test utilities for common patterns
- Comprehensive testing for hooks and utilities

## Mobile-First Development
- Touch-friendly interactions with proper touch targets
- Swipe gestures using custom `useSwipeGesture` hook
- Virtual keyboard handling with `useVirtualKeyboard`
- Responsive breakpoints with `useIsMobile` hook
- Mobile-specific components in `/client/src/components/mobile/`
- Mobile navigation patterns (hamburger menu, drawer)

## Performance Optimization
- TanStack Query for efficient data fetching with caching
- Skeleton loading states throughout the application
- Optimistic updates for better UX
- Framer Motion for smooth animations
- Code splitting and lazy loading preparation
- Background processing for AI content generation

## Component Library Integration
- shadcn/ui with 57+ pre-built components
- Radix UI primitives for accessibility
- CSS variables for theming system
- Tailwind CSS integration with custom design tokens
- Consistent variant system using CVA
- Dark/light mode support via next-themes

## Testing and Deployment
- Project optimized for Replit deployment
- Custom Vite plugins for development experience
- ESBuild for server bundling
- Real-time error overlay in development mode
- PostgreSQL session management
- Background job processing for content generation