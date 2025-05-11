import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import * as youtube from '../youtube';
import * as openai from '../openai';
import { youtubeUrlSchema } from '@shared/schema';
import { ZodError } from 'zod';

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

export default router;