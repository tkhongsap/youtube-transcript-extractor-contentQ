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

// Export flashcard set
router.get('/:id/export', isAuthenticated, async (req: any, res) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const format = (req.query.format as string) || 'csv';
    if (format !== 'csv') {
      return res.status(400).json({ message: 'Unsupported format' });
    }
    const set = await storage.getFlashcardSet(setId);
    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }
    const cards = await storage.getFlashcards(setId);
    const escape = (text: string) => `"${text.replace(/"/g, '""')}"`;
    const csv = ['Question,Answer', ...cards.map(c => `${escape(c.question)},${escape(c.answer)}`)].join('\n');
    const filename = `${set.title.replace(/\s+/g, '_')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting flashcard set:', error);
    res.status(500).json({ message: 'Failed to export flashcard set' });
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