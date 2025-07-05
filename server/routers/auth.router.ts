import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// Get authenticated user
router.get('/user', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;