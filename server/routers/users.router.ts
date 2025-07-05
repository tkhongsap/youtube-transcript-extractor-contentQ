import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';

const router = Router();

// Get user profile
router.get('/:id', isAuthenticated, async (req: any, res) => {
  try {
    if (req.params.id !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:id', isAuthenticated, async (req: any, res) => {
  try {
    if (req.params.id !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const updated = await storage.upsertUser({ id: req.params.id, ...req.body });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user profile
router.delete('/:id', isAuthenticated, async (req: any, res) => {
  try {
    if (req.params.id !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await storage.deleteUser(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
