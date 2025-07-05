import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { searchContent, ResultType } from '../services/searchService';

const router = Router();

router.get('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const type = typeof req.query.type === 'string' ? req.query.type as ResultType : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!query) {
      return res.json({ results: [] });
    }

    const results = await searchContent(userId, query, type, limit);
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

export default router;
