import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Get authenticated user
router.get('/user', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;