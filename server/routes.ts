import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import * as youtube from "./youtube";
import * as openai from "./openai";
import { youtubeUrlSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Video processing endpoint
  app.post('/api/videos/process', isAuthenticated, async (req: any, res) => {
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
        error: error.message 
      });
    }
  });
  
  // Get user's videos
  app.get('/api/videos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
      
      const videos = await storage.getUserVideos(userId, limit);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });
  
  // Get video details
  app.get('/api/videos/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/videos/:id/summary', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/videos/:id/reports', isAuthenticated, async (req: any, res) => {
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
  
  // Get user's reports
  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
      
      const reports = await storage.getUserReports(userId, limit);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });
  
  // Delete report
  app.delete('/api/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const reportId = parseInt(req.params.id, 10);
      await storage.deleteReport(reportId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting report:", error);
      res.status(500).json({ message: "Failed to delete report" });
    }
  });
  
  // Get video flashcard sets
  app.get('/api/videos/:id/flashcard-sets', isAuthenticated, async (req: any, res) => {
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
  
  // Get user's flashcard sets
  app.get('/api/flashcard-sets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
      
      const sets = await storage.getUserFlashcardSets(userId, limit);
      res.json(sets);
    } catch (error) {
      console.error("Error fetching flashcard sets:", error);
      res.status(500).json({ message: "Failed to fetch flashcard sets" });
    }
  });
  
  // Get flashcards in a set
  app.get('/api/flashcard-sets/:id/cards', isAuthenticated, async (req: any, res) => {
    try {
      const setId = parseInt(req.params.id, 10);
      const cards = await storage.getFlashcards(setId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });
  
  // Delete flashcard set
  app.delete('/api/flashcard-sets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const setId = parseInt(req.params.id, 10);
      await storage.deleteFlashcardSet(setId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting flashcard set:", error);
      res.status(500).json({ message: "Failed to delete flashcard set" });
    }
  });
  
  // Get video idea sets
  app.get('/api/videos/:id/idea-sets', isAuthenticated, async (req: any, res) => {
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
  
  // Get user's idea sets
  app.get('/api/idea-sets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const type = req.query.type as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      const sets = await storage.getUserIdeaSets(userId, type, limit);
      res.json(sets);
    } catch (error) {
      console.error("Error fetching idea sets:", error);
      res.status(500).json({ message: "Failed to fetch idea sets" });
    }
  });
  
  // Get ideas in a set
  app.get('/api/idea-sets/:id/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const setId = parseInt(req.params.id, 10);
      const ideas = await storage.getIdeas(setId);
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      res.status(500).json({ message: "Failed to fetch ideas" });
    }
  });
  
  // Delete idea set
  app.delete('/api/idea-sets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const setId = parseInt(req.params.id, 10);
      await storage.deleteIdeaSet(setId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting idea set:", error);
      res.status(500).json({ message: "Failed to delete idea set" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
