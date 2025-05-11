import type { Express } from 'express';
import { createServer, type Server } from "http";
import authRouter from './auth.router';
import videosRouter from './videos.router';
import reportsRouter from './reports.router';
import flashcardsRouter from './flashcards.router';
import ideasRouter from './ideas.router';
import devRouter from './dev.router';
import { setupAuth } from '../replitAuth';

export async function registerAppRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Register domain-specific routers
  app.use('/api/auth', authRouter);
  app.use('/api/videos', videosRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/flashcard-sets', flashcardsRouter);
  app.use('/api/idea-sets', ideasRouter);
  app.use('/api/dev', devRouter);

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}