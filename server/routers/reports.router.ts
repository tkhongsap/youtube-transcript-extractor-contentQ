import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';

const router = Router();

// Get user's reports
router.get('/', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    const reports = await storage.getUserReports(userId, limit);
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// Delete report
router.delete('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    await storage.deleteReport(reportId);
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ message: "Failed to delete report" });
  }
});

// Update report
router.put('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { title, content } = req.body;
    const updated = await storage.updateReport(reportId, { title, content });
    if (!updated) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Failed to update report' });
  }
});

export default router;