import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Validation schemas - matching frontend labels
const CreateAdditionalTextSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(5000, 'Content too long'),
  label: z.enum(['Additional Notes', 'Context', 'Correction', 'Clarification', 'Speaker Note', 'Technical Detail', 'Reference', 'Summary']),
  timestamp: z.number().optional(),
  position: z.enum(['before', 'after', 'inline']).optional(),
  segmentId: z.string().optional(),
});

const UpdateAdditionalTextSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(5000, 'Content too long').optional(),
  label: z.enum(['Additional Notes', 'Context', 'Correction', 'Clarification', 'Speaker Note', 'Technical Detail', 'Reference', 'Summary']).optional(),
  timestamp: z.number().optional(),
  position: z.enum(['before', 'after', 'inline']).optional(),
  segmentId: z.string().optional(),
});

// Helper function to verify video ownership
async function verifyVideoOwnership(videoId: number, userId: string) {
  const video = await storage.getVideo(videoId);
  if (!video) {
    const error = new Error('Video not found');
    (error as any).statusCode = 404;
    throw error;
  }
  if (video.userId !== userId) {
    const error = new Error('Unauthorized');
    (error as any).statusCode = 403;
    throw error;
  }
  return video;
}

// Get all additional text for a video
router.get('/:videoId/additional-text', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    const userId = req.user.claims.sub;

    if (isNaN(videoId)) {
      const error = new Error('Invalid video ID');
      (error as any).statusCode = 400;
      return next(error);
    }

    await verifyVideoOwnership(videoId, userId);

    const additionalTextEntries = await storage.getAdditionalTextByVideoId(videoId);
    const collection = {
      videoId,
      entries: additionalTextEntries,
      totalCharacters: additionalTextEntries.reduce((sum, entry) => sum + entry.content.length, 0),
      lastModified: additionalTextEntries.length > 0 
        ? new Date(Math.max(...additionalTextEntries.map(e => e.updatedAt ? new Date(e.updatedAt).getTime() : 0)))
        : new Date(),
    };

    res.json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
});

// Create new additional text entry
router.post('/:videoId/additional-text', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    const userId = req.user.claims.sub;

    if (isNaN(videoId)) {
      const error = new Error('Invalid video ID');
      (error as any).statusCode = 400;
      return next(error);
    }

    await verifyVideoOwnership(videoId, userId);

    const validatedData = CreateAdditionalTextSchema.parse(req.body);
    
    const entry = await storage.createAdditionalText({
      id: `additional_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      videoId,
      ...validatedData,
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new Error(error.errors[0].message);
      (validationError as any).statusCode = 400;
      return next(validationError);
    }
    next(error);
  }
});

// Update additional text entry
router.put('/:videoId/additional-text/:entryId', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    const entryId = req.params.entryId;
    const userId = req.user.claims.sub;

    if (isNaN(videoId)) {
      const error = new Error('Invalid video ID');
      (error as any).statusCode = 400;
      return next(error);
    }

    await verifyVideoOwnership(videoId, userId);

    const validatedData = UpdateAdditionalTextSchema.parse(req.body);
    
    const entry = await storage.updateAdditionalText(videoId, entryId, validatedData);
    if (!entry) {
      const error = new Error('Additional text entry not found');
      (error as any).statusCode = 404;
      return next(error);
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new Error(error.errors[0].message);
      (validationError as any).statusCode = 400;
      return next(validationError);
    }
    next(error);
  }
});

// Delete additional text entry
router.delete('/:videoId/additional-text/:entryId', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    const entryId = req.params.entryId;
    const userId = req.user.claims.sub;

    if (isNaN(videoId)) {
      const error = new Error('Invalid video ID');
      (error as any).statusCode = 400;
      return next(error);
    }

    await verifyVideoOwnership(videoId, userId);

    const deleted = await storage.deleteAdditionalText(videoId, entryId);
    if (!deleted) {
      const error = new Error('Additional text entry not found');
      (error as any).statusCode = 404;
      return next(error);
    }

    res.json({ success: true, message: 'Additional text deleted' });
  } catch (error) {
    next(error);
  }
});

// Get enhanced transcript (merged original + additional text)
router.get('/:videoId/enhanced-transcript', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    const userId = req.user.claims.sub;

    if (isNaN(videoId)) {
      const error = new Error('Invalid video ID');
      (error as any).statusCode = 400;
      return next(error);
    }

    const video = await verifyVideoOwnership(videoId, userId);

    if (!video.transcript) {
      const error = new Error('Original transcript not available');
      (error as any).statusCode = 404;
      return next(error);
    }

    const additionalTextEntries = await storage.getAdditionalTextByVideoId(videoId);

    // Create enhanced transcript structure
    const originalTranscript = {
      videoId,
      rawText: video.transcript,
      source: 'youtube' as const,
      generatedAt: new Date(),
    };

    const additionalTextCollection = {
      videoId,
      entries: additionalTextEntries,
      totalCharacters: additionalTextEntries.reduce((sum, entry) => sum + entry.content.length, 0),
      lastModified: additionalTextEntries.length > 0 
        ? new Date(Math.max(...additionalTextEntries.map(e => e.updatedAt ? new Date(e.updatedAt).getTime() : 0)))
        : new Date(),
    };

    // Simple merge: original transcript + additional text entries sorted by timestamp
    const sortedEntries = additionalTextEntries
      .filter(entry => entry.timestamp !== undefined)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    let enhancedText = originalTranscript.rawText;
    
    if (sortedEntries.length > 0) {
      enhancedText += '\n\n--- Additional Notes ---\n';
      for (const entry of sortedEntries) {
        const timestampStr = entry.timestamp ? `(${Math.floor(entry.timestamp / 60)}:${String(entry.timestamp % 60).padStart(2, '0')})` : '';
        enhancedText += `\n[${entry.label}] ${timestampStr} ${entry.content}`;
      }
    }

    // Add entries without timestamps at the end
    const nonTimestampedEntries = additionalTextEntries.filter(entry => entry.timestamp === undefined);
    if (nonTimestampedEntries.length > 0) {
      enhancedText += '\n\n--- General Notes ---\n';
      for (const entry of nonTimestampedEntries) {
        enhancedText += `\n[${entry.label}] ${entry.content}`;
      }
    }

    const enhancedTranscript = {
      originalTranscript,
      additionalTextCollection,
      mergedText: enhancedText,
      enhancementCount: additionalTextEntries.length,
      wordCount: enhancedText.split(/\s+/).length,
      format: 'plain' as const,
      generatedAt: new Date(),
    };

    res.json({ success: true, data: enhancedTranscript });
  } catch (error) {
    next(error);
  }
});

export default router;