import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import { insertTagSchema } from '@shared/schema';
import { ZodError } from 'zod';

const router = Router();

router.get('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const tags = await storage.getUserTags(userId);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

router.post('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const tag = insertTagSchema.parse({ ...req.body, userId });
    const created = await storage.createTag(tag);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ message: 'Invalid tag data', errors: err.errors });
    }
    next(err);
  }
});

router.put('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await storage.updateTag(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Tag not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await storage.deleteTag(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/video/:videoId/:tagId', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    const tagId = parseInt(req.params.tagId, 10);
    await storage.addTagToVideo(videoId, tagId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.delete('/video/:videoId/:tagId', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    const tagId = parseInt(req.params.tagId, 10);
    await storage.removeTagFromVideo(videoId, tagId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
