import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import * as youtube from '../youtube';
import * as openai from '../openai';
import { youtubeUrlSchema } from '@shared/schema';
import { ZodError } from 'zod';

const router = Router();

// Video processing endpoint
router.post('/process', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const validatedData = youtubeUrlSchema.parse(req.body);
    const youtubeUrl = validatedData.url;
    
    // Extract video ID from URL
    const videoId = youtube.extractVideoId(youtubeUrl);
    
    if (!videoId) {
      const error = new Error('Invalid YouTube URL format');
      (error as any).statusCode = 400;
      return next(error);
    }
    
    // Check if video already exists for this user
    const existingVideo = await storage.getVideoByYoutubeId(videoId, userId);
    
    if (existingVideo) {
      return res.json(existingVideo);
    }
    
    // Get video metadata
    const videoInfo = await youtube.getVideoInfo(videoId);
    
    // Create video record
    const video = await storage.createVideo({
      userId,
      youtubeId: videoId,
      title: videoInfo.title,
      channelTitle: videoInfo.channelTitle,
      description: videoInfo.description,
      thumbnailUrl: videoInfo.thumbnailUrl,
      duration: videoInfo.duration,
    });
    
    // Return immediately with the video record
    res.status(201).json(video);
    
    // Process transcript and generate content in the background
    (async () => {
      try {
        console.log(`Starting background processing for video ${video.id}`);
        
        // Get transcript
        const transcript = await youtube.getVideoTranscript(videoId);
        console.log(`Got transcript with ${transcript.length} characters`);
        
        // Update video with transcript
        await storage.updateVideo(video.id, { transcript });
        
        // Generate summary with key topics
        const summaryData = await openai.generateSummary(transcript, video.title);
        console.log(`Generated summary with ${summaryData.keyTopics.length} key topics`);
        
        // Save summary
        await storage.createSummary({
          videoId: video.id,
          summary: summaryData.summary,
          keyTopics: summaryData.keyTopics,
        });
        
        // Generate Medium and LinkedIn reports
        const mediumReport = await openai.generateMediumReport(transcript, video.title, summaryData.summary);
        const linkedinReport = await openai.generateLinkedInPost(transcript, video.title, summaryData.summary);
        
        // Save reports
        await storage.createReport({
          videoId: video.id,
          title: mediumReport.title,
          content: mediumReport.content,
          type: "medium",
        });
        
        await storage.createReport({
          videoId: video.id,
          title: linkedinReport.title,
          content: linkedinReport.content,
          type: "linkedin",
        });
        
        // Generate flashcards
        const flashcardData = await openai.generateFlashcards(transcript, video.title, summaryData.summary);
        const flashcardSet = await storage.createFlashcardSet({
          videoId: video.id,
          title: flashcardData.title,
          description: flashcardData.description,
        });
        
        // Save individual flashcards
        for (const card of flashcardData.flashcards) {
          await storage.createFlashcard({
            flashcardSetId: flashcardSet.id,
            question: card.question,
            answer: card.answer,
          });
        }
        
        // Generate different types of ideas
        const ideaTypes = [
          { type: 'blog_titles', generator: openai.generateBlogIdeas },
          { type: 'social_media_hooks', generator: openai.generateSocialMediaHooks },
          { type: 'questions', generator: openai.generateFollowUpQuestions },
        ];
        
        for (const { type, generator } of ideaTypes) {
          const ideas = await generator(transcript, video.title, summaryData.summary);
          const ideaSet = await storage.createIdeaSet({
            videoId: video.id,
            type,
          });
          
          // Save individual ideas
          for (const idea of ideas) {
            await storage.createIdea({
              ideaSetId: ideaSet.id,
              content: idea,
            });
          }
        }
        
        console.log(`Completed background processing for video ${video.id}`);
        
      } catch (error) {
        console.error(`Error in background processing for video ${video.id}:`, error);
      }
    })();
    
  } catch (error) {
    console.error("Error processing video:", error);
    
    if (error instanceof ZodError) {
      const validationError = new Error('Invalid YouTube URL');
      (validationError as any).statusCode = 400;
      (validationError as any).details = error.errors;
      return next(validationError);
    }
    
    next(error);
  }
});

// Get user's videos
router.get('/', isAuthenticated, async (req: any, res, next) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    const videos = await storage.getUserVideos(userId, limit);
    res.json(videos);
  } catch (error) {
    next(error);
  }
});

// Get video details
router.get('/:id', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      const error = new Error('Video not found');
      (error as any).statusCode = 404;
      return next(error);
    }
    
    // Check if user owns the video
    if (video.userId !== req.user.claims.sub) {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 403;
      return next(error);
    }
    
    res.json(video);
  } catch (error) {
    next(error);
  }
});

// Get video transcript
router.get('/:id/transcript', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoIdParam = req.params.id;
    if (!/^\d+$/.test(videoIdParam)) {
      const error = new Error('Invalid video ID format.');
      (error as any).statusCode = 400;
      return next(error);
    }
    const videoId = parseInt(videoIdParam, 10);
    
    if (!req.user?.claims?.sub) {
      const error = new Error('User information is missing.');
      (error as any).statusCode = 401;
      return next(error);
    }
    const userId = req.user.claims.sub;
    
    const video = await storage.getVideo(videoId);
    const format = (req.query.format as string) || 'text';
    
    if (!video) {
      const error = new Error('Video not found');
      (error as any).statusCode = 404;
      return next(error);
    }
    
    if (video.userId !== userId) {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 403;
      return next(error);
    }
    
    console.log(`Fetching fresh transcript for video: ${video.youtubeId}`);
    
    if (format === 'timestamped') {
      try {
        const timestampedTranscript = await youtube.getVideoTranscriptWithTimestamps(video.youtubeId);
        return res.json({
          format: 'timestamped',
          data: { transcript: timestampedTranscript }
        });
      } catch (error) {
        if (video.transcript) {
          console.warn(`Falling back to stored transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}).`);
          return res.json({
            format: 'text-stored',
            data: { transcript: video.transcript }
          });
        } else {
          console.warn(`Unable to retrieve transcript from YouTube API for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}), and no stored transcript was found.`);
          const err = new Error('Transcript not available from YouTube and not found in storage.');
          (err as any).statusCode = 404;
          return next(err);
        }
      }
    } else {
      try {
        const fullTranscriptText = await youtube.getVideoTranscriptWithFallbacks(video.youtubeId);
        return res.json({
          format: 'text',
          data: { transcript: fullTranscriptText }
        });
      } catch (error) {
        if (video.transcript) {
          console.warn(`Falling back to stored transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}).`);
          return res.json({
            format: 'text-stored',
            data: { transcript: video.transcript }
          });
        } else {
          console.warn(`Unable to retrieve transcript from YouTube API for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}), and no stored transcript was found.`);
          const err = new Error('Transcript not available from YouTube and not found in storage.');
          (err as any).statusCode = 404;
          return next(err);
        }
      }
    }
  } catch (error) {
    console.error(`General error in /:id/transcript for DB video ID ${req.params.id}:`, error);
    next(error);
  }
});

// Get video summary
router.get('/:id/summary', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      const error = new Error('Video not found');
      (error as any).statusCode = 404;
      return next(error);
    }
    
    if (video.userId !== req.user.claims.sub) {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 403;
      return next(error);
    }
    
    const summary = await storage.getVideoSummary(videoId);
    
    if (!summary) {
      const error = new Error('Summary not found');
      (error as any).statusCode = 404;
      return next(error);
    }
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Get video reports
router.get('/:id/reports', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      const error = new Error('Video not found');
      (error as any).statusCode = 404;
      return next(error);
    }
    
    if (video.userId !== req.user.claims.sub) {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 403;
      return next(error);
    }
    
    const reports = await storage.getVideoReports(videoId);
    res.json(reports);
  } catch (error) {
    next(error);
  }
});

// Get video flashcard sets
router.get('/:id/flashcard-sets', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      const error = new Error('Video not found');
      (error as any).statusCode = 404;
      return next(error);
    }
    
    if (video.userId !== req.user.claims.sub) {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 403;
      return next(error);
    }
    
    const sets = await storage.getFlashcardSets(videoId);
    res.json(sets);
  } catch (error) {
    next(error);
  }
});

// Get video idea sets
router.get('/:id/idea-sets', isAuthenticated, async (req: any, res, next) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      const error = new Error('Video not found');
      (error as any).statusCode = 404;
      return next(error);
    }
    
    if (video.userId !== req.user.claims.sub) {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 403;
      return next(error);
    }
    
    const sets = await storage.getIdeaSets(videoId);
    res.json(sets);
  } catch (error) {
    next(error);
  }
});

// Update video metadata
router.put('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    if (video.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const updated = await storage.updateVideo(videoId, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ message: 'Failed to update video' });
  }
});

// Delete video and all related data
router.delete('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    if (video.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await storage.deleteVideo(videoId);
    res.json({ message: 'Video deleted' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
});

export default router;