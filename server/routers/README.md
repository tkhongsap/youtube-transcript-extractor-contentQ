# Router Structure Documentation

This document provides an overview of the modular router structure implemented in the application to improve maintainability and organization.

## Overview

The router structure follows a domain-driven approach, where each major feature or resource has its own dedicated router file. This approach improves code organization, readability, and makes it easier to maintain and extend the API.

## Directory Structure

```
server/
├── routers/
│   ├── middleware/
│   │   ├── errorHandler.ts  - Centralized error handling middleware
│   │   └── index.ts         - Exports middleware components
│   ├── auth.router.ts       - Authentication related routes
│   ├── videos.router.ts     - Video processing and management routes
│   ├── reports.router.ts    - Report management routes
│   ├── flashcards.router.ts - Flashcard set management routes
│   ├── ideas.router.ts      - Idea set management routes
│   ├── dev.router.ts        - Development utility routes
│   ├── index.ts             - Router registration and setup
│   └── README.md            - This documentation file
└── ...
```

## Router Registration

All routers are registered in the `routers/index.ts` file through the `registerAppRoutes` function. This function:

1. Sets up authentication middleware
2. Registers each domain-specific router with its appropriate base path
3. Applies global error handling middleware
4. Creates and returns an HTTP server

## Router Structure

Each router file follows a consistent pattern:

1. Import dependencies:
   - Express Router
   - Middleware (authentication, etc.)
   - Service modules (storage, YouTube, OpenAI, etc.)
   - Validation schemas

2. Create a router instance
3. Define routes with handlers
4. Export the router

Example:
```typescript
import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import * as storage from '../storage';

const router = Router();

// GET /api/resource
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    // Handler implementation
  } catch (error) {
    next(error); // Forward to error handling middleware
  }
});

export default router;
```

## Error Handling

Errors are handled by a centralized error handling middleware in `middleware/errorHandler.ts`. This middleware:

1. Provides consistent error response formats
2. Handles common error types (validation errors, etc.)
3. Includes appropriate status codes and messages based on error type
4. Hides implementation details in production environments

## Adding New Endpoints

To add a new endpoint:

1. Identify the appropriate router file based on the domain/resource
2. Add the new route definition with appropriate HTTP method and path
3. Implement the route handler with proper error handling
4. Make sure to follow existing patterns for authentication, validation, etc.

For example, to add an endpoint to get a specific flashcard:

```typescript
// In flashcards.router.ts
router.get('/:setId/cards/:cardId', isAuthenticated, async (req, res, next) => {
  try {
    const { setId, cardId } = req.params;
    const card = await storage.getFlashcard(setId, cardId);
    
    if (!card) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }
    
    res.json(card);
  } catch (error) {
    next(error);
  }
});
```

## Creating New Routers

If you need to add a new domain/resource router:

1. Create a new file named `[resource].router.ts` in the `routers` directory
2. Follow the router structure pattern described above
3. Register the new router in `routers/index.ts` with the appropriate base path

```typescript
// In routers/index.ts
import newResourceRouter from './newResource.router';

// In registerAppRoutes function
app.use('/api/new-resource', newResourceRouter);
``` 