import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import { insertIdeaSetSchema, insertIdeaSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

const updateIdeaSetSchema = insertIdeaSetSchema.partial();
const updateIdeaSchema = insertIdeaSchema.partial();

// Get user's idea sets
router.get('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const type = req.query.type as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const sets = await storage.getUserIdeaSets(userId, type, limit);
    res.json({ success: true, data: sets });
  } catch (error) {
    next(error);
  }
});

// Get ideas in a set
router.get('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const set = await storage.getIdeaSet(setId);
    if (!set) {
      return res.status(404).json({ success: false, error: 'Idea set not found' });
    }
    if (set.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    res.json({ success: true, data: set });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const parsed = updateIdeaSetSchema.parse(req.body);

    const existing = await storage.getIdeaSet(setId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Idea set not found' });
    }
    if (existing.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updated = await storage.updateIdeaSet(setId, parsed);
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', message: error.message });
    }
    next(error);
  }
});

router.get('/:id/ideas', isAuthenticated, async (req: any, res, next) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const ideas = await storage.getIdeas(setId);
    res.json({ success: true, data: ideas });
  } catch (error) {
    next(error);
  }
});

// Delete idea set
router.delete('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const set = await storage.getIdeaSet(setId);
    if (!set) {
      return res.status(404).json({ success: false, error: 'Idea set not found' });
    }
    if (set.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    await storage.deleteIdeaSet(setId);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

router.put('/ideas/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const ideaId = parseInt(req.params.id, 10);
    const parsed = updateIdeaSchema.parse(req.body);

    const existing = await storage.getIdea(ideaId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }
    if (existing.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updated = await storage.updateIdea(ideaId, parsed);
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', message: error.message });
    }
    next(error);
  }
});

router.delete('/ideas/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const ideaId = parseInt(req.params.id, 10);
    const idea = await storage.getIdea(ideaId);
    if (!idea) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }
    if (idea.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    await storage.deleteIdea(ideaId);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

export default router;
