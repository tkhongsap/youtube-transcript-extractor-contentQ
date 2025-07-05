import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import { insertFlashcardSetSchema, insertFlashcardSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

const updateFlashcardSetSchema = insertFlashcardSetSchema.partial();
const updateFlashcardSchema = insertFlashcardSchema.partial();

// Get user's flashcard sets
router.get('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const sets = await storage.getUserFlashcardSets(userId, limit);
    res.json({ success: true, data: sets });
  } catch (error) {
    next(error);
  }
});

// Get flashcards in a set
router.get('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const set = await storage.getFlashcardSet(setId);
    if (!set) {
      return res.status(404).json({ success: false, error: 'Flashcard set not found' });
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
    const parsed = updateFlashcardSetSchema.parse(req.body);

    const existing = await storage.getFlashcardSet(setId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Flashcard set not found' });
    }
    if (existing.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updated = await storage.updateFlashcardSet(setId, parsed);
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', message: error.message });
    }
    next(error);
  }
});

router.get('/:id/cards', isAuthenticated, async (req: any, res, next) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const cards = await storage.getFlashcards(setId);
    res.json({ success: true, data: cards });
  } catch (error) {
    next(error);
  }
});

router.put('/cards/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    const parsed = updateFlashcardSchema.parse(req.body);

    const existing = await storage.getFlashcard(cardId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }
    if (existing.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updated = await storage.updateFlashcard(cardId, parsed);
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', message: error.message });
    }
    next(error);
  }
});

router.delete('/cards/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    const card = await storage.getFlashcard(cardId);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Flashcard not found' });
    }
    if (card.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    await storage.deleteFlashcard(cardId);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// Delete flashcard set
router.delete('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const set = await storage.getFlashcardSet(setId);
    if (!set) {
      return res.status(404).json({ success: false, error: 'Flashcard set not found' });
    }
    if (set.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    await storage.deleteFlashcardSet(setId);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

export default router;
