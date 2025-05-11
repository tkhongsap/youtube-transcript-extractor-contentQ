import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';

const router = Router();

// Get user's flashcard sets
router.get('/', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    const sets = await storage.getUserFlashcardSets(userId, limit);
    res.json(sets);
  } catch (error) {
    console.error("Error fetching flashcard sets:", error);
    res.status(500).json({ message: "Failed to fetch flashcard sets" });
  }
});

// Get flashcards in a set
router.get('/:id/cards', isAuthenticated, async (req: any, res) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const cards = await storage.getFlashcards(setId);
    res.json(cards);
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    res.status(500).json({ message: "Failed to fetch flashcards" });
  }
});

// Delete flashcard set
router.delete('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const setId = parseInt(req.params.id, 10);
    await storage.deleteFlashcardSet(setId);
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting flashcard set:", error);
    res.status(500).json({ message: "Failed to delete flashcard set" });
  }
});

export default router;