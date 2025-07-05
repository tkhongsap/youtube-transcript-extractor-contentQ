import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import * as youtube from '../youtube';
import * as openai from '../openai';
import { youtubeUrlSchema } from '@shared/schema';
import { ZodError } from 'zod';

// Define types for better documentation and code completion, 
// but we'll use 'any' in the request handlers to avoid TypeScript compatibility issues with Express
interface AuthenticatedUser {
  claims: {
    sub: string;
    // other claims as needed
  };
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

interface VideoData {
  id: number;
  userId: string;
  youtubeId: string;
  title: string;
  channelTitle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  duration: string | null;
  transcript: string | null;
  createdAt?: Date | null;
}

interface TimestampedTranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  timestamp: string;
}

interface TimestampedTranscript {
  success: boolean;
  videoId: string;
  title?: string;
  channel?: string;
  duration?: string;
  segmentCount: number;
  transcript: TimestampedTranscriptSegment[];
  error?: string;
}

const router = Router();

// Video processing endpoint
router.post('/process', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const validatedData = youtubeUrlSchema.parse(req.body);
    const youtubeUrl = validatedData.url;
    
    // Extract video ID from URL
    const videoId = youtube.extractVideoId(youtubeUrl);
    
    // Check if video already exists for this user
    const existingVideo = await storage.getVideoByYoutubeId(videoId, userId);
    if (existingVideo) {
      return res.json({ 
        message: "Video already processed", 
        video: existingVideo, 
        alreadyExists: true 
      });
    }
    
    // Fetch video details from YouTube API
    const videoDetails = await youtube.getVideoDetails(videoId);
    
    // Create video record
    const video = await storage.createVideo({
      userId,
      youtubeId: videoId,
      title: videoDetails.title,
      channelTitle: videoDetails.channelTitle,
      description: videoDetails.description,
      thumbnailUrl: videoDetails.thumbnailUrl,
      duration: videoDetails.duration,
      transcript: "", // Will be updated later
    });
    
    res.status(201).json({ 
      message: "Video processing started", 
      video,
      alreadyExists: false
    });
    
    // Continue processing asynchronously
    (async () => {
      try {
        // Get transcript
        const transcript = await youtube.getVideoTranscript(videoId);
        
        // Update video with transcript - use updateVideo instead of createVideo
        // to avoid the duplicate key error
        await storage.updateVideo(video.id, { transcript });
        
        // Generate summary
        const summarization = await openai.generateVideoSummary(transcript, videoDetails.title);
        
        // Store summary
        await storage.createSummary({
          videoId: video.id,
          summary: summarization.summary,
          keyTopics: summarization.keyTopics
        });
        
        // Generate and store Medium report
        const mediumReport = await openai.generateMediumReport(transcript, videoDetails.title, summarization.summary);
        await storage.createReport({
          videoId: video.id,
          title: mediumReport.title,
          content: mediumReport.content,
          type: "medium"
        });
        
        // Generate and store LinkedIn post
        const linkedInPost = await openai.generateLinkedInPost(transcript, videoDetails.title, summarization.summary);
        await storage.createReport({
          videoId: video.id,
          title: linkedInPost.title,
          content: linkedInPost.content,
          type: "linkedin"
        });
        
        // Generate and store flashcards
        const flashcardGeneration = await openai.generateFlashcards(transcript, videoDetails.title, summarization.summary);
        const flashcardSet = await storage.createFlashcardSet({
          videoId: video.id,
          title: flashcardGeneration.title,
          description: flashcardGeneration.description
        });
        
        for (const card of flashcardGeneration.flashcards) {
          await storage.createFlashcard({
            flashcardSetId: flashcardSet.id,
            question: card.question,
            answer: card.answer
          });
        }
        
        // Generate and store blog ideas
        const blogIdeas = await openai.generateBlogIdeas(transcript, videoDetails.title, summarization.summary);
        const blogIdeaSet = await storage.createIdeaSet({
          videoId: video.id,
          type: "blog_titles"
        });
        
        for (const idea of blogIdeas) {
          await storage.createIdea({
            ideaSetId: blogIdeaSet.id,
            content: idea
          });
        }
        
        // Generate and store social media hooks
        const socialMediaHooks = await openai.generateSocialMediaHooks(transcript, videoDetails.title, summarization.summary);
        const socialMediaSet = await storage.createIdeaSet({
          videoId: video.id,
          type: "social_media_hooks"
        });
        
        for (const hook of socialMediaHooks) {
          await storage.createIdea({
            ideaSetId: socialMediaSet.id,
            content: hook
          });
        }
        
        // Generate and store follow-up questions
        const followUpQuestions = await openai.generateFollowUpQuestions(transcript, videoDetails.title, summarization.summary);
        const questionsSet = await storage.createIdeaSet({
          videoId: video.id,
          type: "questions"
        });
        
        for (const question of followUpQuestions) {
          await storage.createIdea({
            ideaSetId: questionsSet.id,
            content: question
          });
        }
        
        console.log(`Completed processing for video ${video.id}`);
        
      } catch (error) {
        console.error(`Error in background processing for video ${video.id}:`, error);
      }
    })();
    
  } catch (error) {
    console.error("Error processing video:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: "Invalid YouTube URL", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Failed to process video", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user's videos
router.get('/', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    const videos = await storage.getUserVideos(userId, limit);
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

// Get video details
router.get('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Check if user owns the video
    if (video.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    res.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({ message: "Failed to fetch video" });
  }
});

// Get video transcript
router.get('/:id/transcript', isAuthenticated, async (req: any, res) => {
  try {
    const videoIdParam = req.params.id;
    // Validate videoIdParam is a number string before parsing
    if (!/^\d+$/.test(videoIdParam)) {
      return res.status(400).json({ message: "Invalid video ID format." });
    }
    const videoId = parseInt(videoIdParam, 10);
    
    // Ensure user information exists
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "User information is missing." });
    }
    const userId = req.user.claims.sub;
    
    const video = await storage.getVideo(videoId) as VideoData | null;
    const format = (req.query.format as string) || 'text'; // Default to text format
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Check if user owns the video
    if (video.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // Always fetch fresh transcript directly from YouTube
    console.log(`Fetching fresh transcript for video: ${video.youtubeId}`);
    
    // If the format is 'timestamped', fetch the transcript with timestamps
    if (format === 'timestamped') {
      try {
        const timestampedTranscriptData = await youtube.getVideoTranscriptWithTimestamps(video.youtubeId);
        return res.json({
          format: 'timestamped',
          data: timestampedTranscriptData
        });
      } catch (timestampError) {
        console.error(`Error fetching timestamped transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}):`, timestampError);
        // If we can't get the timestamped version, try to get the regular version
        try {
          const fullTranscriptText = await youtube.getVideoTranscriptWithFallbacks(video.youtubeId);
          return res.json({
            format: 'text',
            data: { transcript: fullTranscriptText }
          });
        } catch (textError) {
          console.error(`Error fetching text transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}) after timestamped attempt failed:`, textError);
          // Last resort: return the stored transcript if both fresh fetches fail
          if (video.transcript) {
            console.warn(`Falling back to stored transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}).`);
            return res.json({
              format: 'text-stored',
              data: { transcript: video.transcript }
            });
          } else {
            console.warn(`Unable to retrieve transcript from YouTube API for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}), and no stored transcript was found.`);
            return res.status(404).json({ message: "Transcript not available from YouTube and not found in storage." });
          }
        }
      }
    } else {
      // For text format, get fresh transcript
      try {
        const fullTranscriptText = await youtube.getVideoTranscriptWithFallbacks(video.youtubeId);
        return res.json({
          format: 'text',
          data: { transcript: fullTranscriptText }
        });
      } catch (textError) {
        console.error(`Error fetching text transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}):`, textError);
        // Fall back to stored transcript if fresh fetch fails
        if (video.transcript) {
          console.warn(`Falling back to stored transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}).`);
          return res.json({
            format: 'text-stored',
            data: { transcript: video.transcript }
          });
        } else {
          console.warn(`Unable to retrieve transcript from YouTube API for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}), and no stored transcript was found.`);
          return res.status(404).json({ message: "Transcript not available from YouTube and not found in storage." });
        }
      }
    }
  } catch (error) {
    console.error(`General error in /:id/transcript for DB video ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to fetch transcript due to a server error." });
  }
});

// Get video summary
router.get('/:id/summary', isAuthenticated, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Check if user owns the video
    if (video.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    const summary = await storage.getVideoSummary(videoId);
    
    if (!summary) {
      return res.status(404).json({ message: "Summary not found" });
    }
    
    res.json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

// Get video reports
router.get('/:id/reports', isAuthenticated, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Check if user owns the video
    if (video.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    const reports = await storage.getVideoReports(videoId);
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// Get video flashcard sets
router.get('/:id/flashcard-sets', isAuthenticated, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Check if user owns the video
    if (video.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    const sets = await storage.getFlashcardSets(videoId);
    res.json(sets);
  } catch (error) {
    console.error("Error fetching flashcard sets:", error);
    res.status(500).json({ message: "Failed to fetch flashcard sets" });
  }
});

// Get video idea sets
router.get('/:id/idea-sets', isAuthenticated, async (req: any, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const video = await storage.getVideo(videoId);
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Check if user owns the video
    if (video.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    const sets = await storage.getIdeaSets(videoId);
    res.json(sets);
  } catch (error) {
    console.error("Error fetching idea sets:", error);
    res.status(500).json({ message: "Failed to fetch idea sets" });
  }
});

// Reprocess video to get fresh transcript and derived content
router.post('/:id/reprocess', isAuthenticated, async (req: any, res) => {
  try {
    const videoIdParam = req.params.id;
    // Validate videoIdParam is a number string before parsing
    if (!/^\d+$/.test(videoIdParam)) {
      return res.status(400).json({ message: "Invalid video ID format." });
    }
    const videoId = parseInt(videoIdParam, 10);
    
    // Ensure user information exists
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "User information is missing." });
    }
    const userId = req.user.claims.sub;
    
    const video = await storage.getVideo(videoId) as VideoData | null;
    
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Check if user owns the video
    if (video.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // Start reprocessing and return immediately
    res.json({ 
      message: "Video reprocessing started", 
      video,
      reprocessing: true
    });
    
    // Continue processing asynchronously
    (async () => {
      try {
        // Re-fetch video details from YouTube API to get the latest metadata
        const videoDetails = await youtube.getVideoDetails(video.youtubeId);
        
        // Update video metadata
        await storage.updateVideo(video.id, {
          title: videoDetails.title,
          channelTitle: videoDetails.channelTitle,
          description: videoDetails.description,
          thumbnailUrl: videoDetails.thumbnailUrl,
          duration: videoDetails.duration,
        });
        
        // Get fresh transcript with fallback strategies
        const transcript = await youtube.getVideoTranscriptWithFallbacks(video.youtubeId);
        
        // Update video with transcript
        await storage.updateVideo(video.id, { transcript });
        
        // Generate fresh summary
        const summarization = await openai.generateVideoSummary(transcript, videoDetails.title);
        
        // Delete existing summary and create new one
        // Note: There's no direct method to delete a summary, so we're just updating it
        await storage.createSummary({
          videoId: video.id,
          summary: summarization.summary,
          keyTopics: summarization.keyTopics
        });
        
        // Generate and store Medium report
        const mediumReport = await openai.generateMediumReport(transcript, videoDetails.title, summarization.summary);
        await storage.createReport({
          videoId: video.id,
          title: mediumReport.title,
          content: mediumReport.content,
          type: "medium"
        });
        
        // Generate and store LinkedIn post
        const linkedInPost = await openai.generateLinkedInPost(transcript, videoDetails.title, summarization.summary);
        await storage.createReport({
          videoId: video.id,
          title: linkedInPost.title,
          content: linkedInPost.content,
          type: "linkedin"
        });
        
        // Generate and store flashcards
        const flashcardGeneration = await openai.generateFlashcards(transcript, videoDetails.title, summarization.summary);
        const flashcardSet = await storage.createFlashcardSet({
          videoId: video.id,
          title: flashcardGeneration.title,
          description: flashcardGeneration.description
        });
        
        for (const card of flashcardGeneration.flashcards) {
          await storage.createFlashcard({
            flashcardSetId: flashcardSet.id,
            question: card.question,
            answer: card.answer
          });
        }
        
        // Generate and store blog ideas
        const blogIdeas = await openai.generateBlogIdeas(transcript, videoDetails.title, summarization.summary);
        const blogIdeaSet = await storage.createIdeaSet({
          videoId: video.id,
          type: "blog_titles"
        });
        
        for (const idea of blogIdeas) {
          await storage.createIdea({
            ideaSetId: blogIdeaSet.id,
            content: idea
          });
        }
        
        // Generate and store social media hooks
        const socialMediaHooks = await openai.generateSocialMediaHooks(transcript, videoDetails.title, summarization.summary);
        const socialMediaSet = await storage.createIdeaSet({
          videoId: video.id,
          type: "social_media_hooks"
        });
        
        for (const hook of socialMediaHooks) {
          await storage.createIdea({
            ideaSetId: socialMediaSet.id,
            content: hook
          });
        }
        
        // Generate and store follow-up questions
        const followUpQuestions = await openai.generateFollowUpQuestions(transcript, videoDetails.title, summarization.summary);
        const questionsSet = await storage.createIdeaSet({
          videoId: video.id,
          type: "questions"
        });
        
        for (const question of followUpQuestions) {
          await storage.createIdea({
            ideaSetId: questionsSet.id,
            content: question
          });
        }
        
        console.log(`Completed reprocessing for video ${video.id}`);
        
      } catch (error) {
        console.error(`Error in background reprocessing for video ${video.id}:`, error);
      }
    })();
    
  } catch (error) {
    console.error("Error reprocessing video:", error);
    
    res.status(500).json({ 
      message: "Failed to reprocess video", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;