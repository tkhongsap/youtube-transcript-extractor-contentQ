import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import { insertReportSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

const updateReportSchema = insertReportSchema.partial();

// Get user's reports
router.get('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const reports = await storage.getUserReports(userId, limit);
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const report = await storage.getReport(reportId);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    if (report.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const parsed = updateReportSchema.parse(req.body);

    const existing = await storage.getReport(reportId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    if (existing.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updated = await storage.updateReport(reportId, parsed);
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', message: error.message });
    }
    next(error);
  }
});

// Delete report
router.delete('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    if (report.userId !== req.user.claims.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    await storage.deleteReport(reportId);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

export default router;
