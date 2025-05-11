import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';

const router = Router();

// Get user's idea sets
router.get('/', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const type = req.query.type as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    const sets = await storage.getUserIdeaSets(userId, type, limit);
    res.json(sets);
  } catch (error) {
    console.error("Error fetching idea sets:", error);
    res.status(500).json({ message: "Failed to fetch idea sets" });
  }
});

// Get ideas in a set
router.get('/:id/ideas', isAuthenticated, async (req: any, res) => {
  try {
    const setId = parseInt(req.params.id, 10);
    const ideas = await storage.getIdeas(setId);
    res.json(ideas);
  } catch (error) {
    console.error("Error fetching ideas:", error);
    res.status(500).json({ message: "Failed to fetch ideas" });
  }
});

// Delete idea set
router.delete('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const setId = parseInt(req.params.id, 10);
    await storage.deleteIdeaSet(setId);
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting idea set:", error);
    res.status(500).json({ message: "Failed to delete idea set" });
  }
});

export default router;