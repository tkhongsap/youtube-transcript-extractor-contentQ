import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import * as youtube from '../youtube';
import * as openai from '../openai';
import * as rateLimiter from '../rateLimiter';
import { youtubeUrlSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { getTranscriptForAI, DEFAULT_AI_CONFIG, type AIProcessingConfig } from '../transcriptEnhancement';

// Helper function to validate and prepare video for content generation
async function validateVideoForGeneration(videoIdParam: string, userId: string) {
  // Validate video ID parameter
  if (!/^\d+$/.test(videoIdParam)) {
    throw new Error("Invalid video ID format.");
  }
  const videoId = parseInt(videoIdParam, 10);
  
  const video = await storage.getVideo(videoId);
  if (!video) {
    throw new Error('Video not found');
  }

  if (video.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (!(await rateLimiter.consume(userId))) {
    throw new Error('Rate limit exceeded');
  }

  // Ensure transcript is available
  let transcript = video.transcript;
  if (!transcript) {
    transcript = await youtube.getVideoTranscriptWithFallbacks(video.youtubeId);
    await storage.updateVideo(video.id, { transcript });
  }

  const summary = await storage.getVideoSummary(video.id);
  const summaryText = summary?.summary || '';

  return { video, transcript, summaryText };
}

// Enhanced helper function that can use enhanced transcripts
async function validateVideoForEnhancedGeneration(
  videoIdParam: string, 
  userId: string,
  config: AIProcessingConfig = DEFAULT_AI_CONFIG
) {
  const { video, transcript: originalTranscript, summaryText } = await validateVideoForGeneration(videoIdParam, userId);
  
  // Get appropriate transcript based on configuration
  const { transcript, isEnhanced } = await getTranscriptForAI(video.id, config.transcriptPreference);
  
  return { 
    video, 
    transcript: transcript || originalTranscript, 
    originalTranscript,
    summaryText, 
    isEnhanced,
    config 
  };
}

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
      const error = new Error('Invalid YouTube URL format. Please provide a valid YouTube video URL.');
      (error as any).statusCode = 400;
      return next(error);
    }
    
    // Check if video already exists for this user
    const existingVideo = await storage.getVideoByYoutubeId(videoId, userId);
    
    if (existingVideo) {
      // Return existing video with current processing status
      return res.json({
        ...existingVideo,
        status: 'processed',
        message: 'Video already processed and available'
      });
    }
    
    try {
      // Get video metadata
      const videoInfo = await youtube.getVideoDetails(videoId);
      
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
      
      // Return immediately with the video record and processing status
      res.status(201).json({
        ...video,
        status: 'processing',
        message: 'Video added successfully. AI content generation is in progress.'
      });
      
      // Process transcript and generate content in the background
      processVideoInBackground(video, videoId);
      
    } catch (videoError) {
      console.error(`Error getting video details for ${videoId}:`, videoError);
      const error = new Error('Unable to access this video. It may be private, deleted, or restricted.');
      (error as any).statusCode = 404;
      return next(error);
    }
    
  } catch (error) {
    console.error("Error processing video:", error);
    
    if (error instanceof ZodError) {
      const validationError = new Error('Invalid YouTube URL format');
      (validationError as any).statusCode = 400;
      return next(validationError);
    }
    
    next(error);
  }
});

// Background processing function with enhanced error handling
async function processVideoInBackground(video: any, videoId: string) {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  
  // Helper function for retrying operations
  async function retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = maxRetries
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`${operationName} failed (attempt ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          console.error(`${operationName} failed after ${retries} attempts, skipping.`);
          return null;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    return null;
  }
  
  try {
    console.log(`Starting background processing for video ${video.id} - "${video.title}"`);
    
    // Step 1: Get transcript with fallback strategies
    const transcript = await retryOperation(
      () => youtube.getVideoTranscriptWithFallbacks(videoId),
      'Transcript extraction'
    );
    
    if (!transcript) {
      console.log(`Transcript extraction failed for video ${video.id}, using description as fallback`);
      // Use video description as fallback content for AI processing
      const fallbackContent = video.description || `Video titled: ${video.title}`;
      
      // Generate content using description
      const summaryData = await retryOperation(
        () => openai.generateVideoSummary(fallbackContent, video.title),
        'Summary generation (fallback)'
      );
      
      if (summaryData) {
        await storage.createSummary({
          videoId: video.id,
          summary: summaryData.summary + '\n\n*Note: Generated from video description as transcript was unavailable.*',
          keyTopics: summaryData.keyTopics,
        });
      }
      return;
    }
    
    console.log(`Successfully extracted transcript: ${transcript.length} characters`);
    
    // Update video with transcript
    await storage.updateVideo(video.id, { transcript });
    
    // Step 2: Generate summary with key topics
    const summaryData = await retryOperation(
      () => openai.generateVideoSummary(transcript, video.title),
      'Summary generation'
    );
    
    if (!summaryData) {
      console.error(`Summary generation failed for video ${video.id}`);
      return;
    }
    
    console.log(`Generated summary with ${summaryData.keyTopics.length} key topics`);
    
    // Save summary
    await storage.createSummary({
      videoId: video.id,
      summary: summaryData.summary,
      keyTopics: summaryData.keyTopics,
    });
    
    // Step 3: Generate reports
    const reportTasks = [
      {
        name: 'Medium report',
        type: 'medium',
        generator: () => openai.generateMediumReport(transcript, video.title, summaryData.summary)
      },
      {
        name: 'LinkedIn post',
        type: 'linkedin',
        generator: () => openai.generateLinkedInPost(transcript, video.title, summaryData.summary)
      }
    ];
    
    for (const task of reportTasks) {
      const report = await retryOperation(task.generator, task.name);
      if (report) {
        await storage.createReport({
          videoId: video.id,
          title: report.title,
          content: report.content,
          type: task.type,
        });
        console.log(`Generated ${task.name}`);
      }
    }
    
    // Step 4: Generate flashcards
    const flashcardData = await retryOperation(
      () => openai.generateFlashcards(transcript, video.title, summaryData.summary),
      'Flashcard generation'
    );
    
    if (flashcardData) {
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
      console.log(`Generated ${flashcardData.flashcards.length} flashcards`);
    }
    
    // Step 5: Generate different types of ideas
    const ideaTypes = [
      { type: 'blog_titles', name: 'Blog titles', generator: openai.generateBlogIdeas },
      { type: 'social_media_hooks', name: 'Social media hooks', generator: openai.generateSocialMediaHooks },
      { type: 'questions', name: 'Follow-up questions', generator: openai.generateFollowUpQuestions },
    ];
    
    for (const { type, name, generator } of ideaTypes) {
      const ideas = await retryOperation(
        () => generator(transcript, video.title, summaryData.summary),
        name
      );
      
      if (ideas && ideas.length > 0) {
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
        console.log(`Generated ${ideas.length} ${name.toLowerCase()}`);
      }
    }
    
    console.log(`✅ Completed background processing for video ${video.id} - "${video.title}"`);
    
  } catch (error) {
    console.error(`❌ Critical error in background processing for video ${video.id}:`, error);
    // Consider updating video record with error status if needed
  }
}

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
    
    // Check if refresh is explicitly requested
    const refresh = req.query.refresh === 'true';
    
    // If we have stored transcript and refresh not requested, use stored version immediately
    if (video.transcript && !refresh) {
      console.log(`Using stored transcript for video: ${video.youtubeId} (${video.transcript.length} chars)`);
      return res.json({
        format: 'text-stored',
        data: { transcript: video.transcript }
      });
    }
    
    // Only fetch fresh transcript if explicitly requested or transcript missing
    console.log(`Fetching fresh transcript for video: ${video.youtubeId}${refresh ? ' (refresh requested)' : ' (no stored transcript)'}`);
    
    if (format === 'timestamped') {
      try {
        const timestampedTranscript = await youtube.getVideoTranscriptWithTimestamps(video.youtubeId);
        // Update stored transcript if we got a fresh one
        if (timestampedTranscript && Array.isArray(timestampedTranscript)) {
          const textTranscript = timestampedTranscript.map(item => item.text).join(' ');
          await storage.updateVideo(video.id, { transcript: textTranscript });
        }
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
        // Update stored transcript if we got a fresh one
        if (fullTranscriptText) {
          await storage.updateVideo(video.id, { transcript: fullTranscriptText });
        }
        return res.json({
          format: 'text-fresh',
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

// Generate individual reports (Medium or LinkedIn)
router.post('/:id/generate-report', isAuthenticated, async (req: any, res, next) => {
  try {
    const type = req.query.type as string;
    if (!['medium', 'linkedin'].includes(type)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    const { video, transcript, summaryText } = await validateVideoForGeneration(
      req.params.id, 
      req.user.claims.sub
    );

    const result = type === 'medium'
      ? await openai.generateMediumReport(transcript, video.title, summaryText)
      : await openai.generateLinkedInPost(transcript, video.title, summaryText);

    const saved = await storage.createReport({
      videoId: video.id,
      title: result.title,
      content: result.content,
      type
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid video ID format.') {
        return res.status(400).json({ message: err.message });
      }
      if (err.message === 'Video not found') {
        return res.status(404).json({ message: err.message });
      }
      if (err.message === 'Unauthorized') {
        return res.status(403).json({ message: err.message });
      }
      if (err.message === 'Rate limit exceeded') {
        return res.status(429).json({ message: err.message });
      }
    }
    next(err);
  }
});

// Generate enhanced reports using enhanced transcripts when available
router.post('/:id/generate-enhanced-report', isAuthenticated, async (req: any, res, next) => {
  try {
    const type = req.query.type as string;
    if (!['medium', 'linkedin'].includes(type)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    // Parse AI configuration from request body
    const aiConfig: AIProcessingConfig = {
      transcriptPreference: req.body.transcriptPreference || 'auto',
      includeProfessionalContext: req.body.includeProfessionalContext ?? true,
      emphasizeAdditionalInsights: req.body.emphasizeAdditionalInsights ?? true,
      enhanceCreativeOutput: req.body.enhanceCreativeOutput ?? false,
    };

    const { video, transcript, originalTranscript, summaryText, isEnhanced, config } = 
      await validateVideoForEnhancedGeneration(req.params.id, req.user.claims.sub, aiConfig);

    const options = {
      useEnhanced: isEnhanced,
      includeProfessionalContext: config.includeProfessionalContext,
      emphasizeAdditionalInsights: config.emphasizeAdditionalInsights,
    };

    console.log(`Generating enhanced ${type} report for video ${video.id} - "${video.title}"`);
    console.log(`Using enhanced transcript: ${isEnhanced}, transcript length: ${transcript.length} chars`);

    let result;
    try {
      result = type === 'medium'
        ? await openai.generateMediumReportEnhanced(
            originalTranscript, 
            isEnhanced ? transcript : undefined, 
            video.title, 
            summaryText,
            options
          )
        : await openai.generateLinkedInPostEnhanced(
            originalTranscript, 
            isEnhanced ? transcript : undefined, 
            video.title, 
            summaryText,
            options
          );
    } catch (openaiError) {
      console.error(`OpenAI generation failed for ${type} report:`, openaiError);
      
      // Return specific error for OpenAI failures
      return res.status(500).json({ 
        message: `Failed to generate ${type} report. Please try again in a moment.`,
        error: 'AI_GENERATION_FAILED',
        details: openaiError instanceof Error ? openaiError.message : 'Unknown AI error'
      });
    }

    if (!result || !result.title || !result.content) {
      console.error(`Invalid result from OpenAI for ${type} report:`, result);
      return res.status(500).json({ 
        message: `Generated ${type} report was incomplete. Please try again.`,
        error: 'INCOMPLETE_GENERATION'
      });
    }

    console.log(`Successfully generated ${type} report: "${result.title}"`);

    const saved = await storage.createReport({
      videoId: video.id,
      title: result.title,
      content: result.content,
      type: isEnhanced ? `${type}_enhanced` : type
    });

    res.status(201).json({ 
      success: true, 
      data: saved,
      meta: {
        usedEnhancedTranscript: isEnhanced,
        transcriptPreference: config.transcriptPreference
      }
    });
  } catch (err) {
    console.error(`Enhanced report generation error for type ${req.query.type}:`, err);
    
    if (err instanceof Error) {
      if (err.message === 'Invalid video ID format.') {
        return res.status(400).json({ message: err.message });
      }
      if (err.message === 'Video not found') {
        return res.status(404).json({ message: err.message });
      }
      if (err.message === 'Unauthorized') {
        return res.status(403).json({ message: err.message });
      }
      if (err.message === 'Rate limit exceeded') {
        return res.status(429).json({ message: err.message });
      }
      
      // Handle specific error patterns
      if (err.message.includes('JSON')) {
        return res.status(500).json({ 
          message: 'AI response format error. Please try again.',
          error: 'JSON_PARSE_ERROR'
        });
      }
      
      if (err.message.includes('timeout') || err.message.includes('ECONNRESET')) {
        return res.status(504).json({ 
          message: 'Request timed out. Please try again.',
          error: 'TIMEOUT_ERROR'
        });
      }
    }
    
    // Generic server error with details for debugging
    res.status(500).json({ 
      message: 'An unexpected error occurred while generating the report. Please try again.',
      error: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Generate enhanced summary using enhanced transcripts when available
router.post('/:id/generate-enhanced-summary', isAuthenticated, async (req: any, res, next) => {
  try {
    // Parse AI configuration from request body
    const aiConfig: AIProcessingConfig = {
      transcriptPreference: req.body.transcriptPreference || 'auto',
      includeProfessionalContext: req.body.includeProfessionalContext ?? true,
      emphasizeAdditionalInsights: req.body.emphasizeAdditionalInsights ?? true,
    };

    const { video, transcript, originalTranscript, isEnhanced, config } = 
      await validateVideoForEnhancedGeneration(req.params.id, req.user.claims.sub, aiConfig);

    const options = {
      useEnhanced: isEnhanced,
      includeProfessionalContext: config.includeProfessionalContext,
      emphasizeAdditionalInsights: config.emphasizeAdditionalInsights,
    };

    const result = await openai.generateVideoSummaryEnhanced(
      originalTranscript,
      isEnhanced ? transcript : undefined,
      video.title,
      options
    );

    // Update or create summary
    const existingSummary = await storage.getVideoSummary(video.id);
    if (existingSummary) {
      // For enhanced summaries, we might want to keep both versions
      // For now, we'll replace the existing summary
      await storage.createSummary({
        videoId: video.id,
        summary: result.summary,
        keyTopics: result.keyTopics,
      });
    } else {
      await storage.createSummary({
        videoId: video.id,
        summary: result.summary,
        keyTopics: result.keyTopics,
      });
    }

    res.status(201).json({ 
      success: true, 
      data: {
        summary: result.summary,
        keyTopics: result.keyTopics,
        videoId: video.id
      },
      meta: {
        usedEnhancedTranscript: isEnhanced,
        transcriptPreference: config.transcriptPreference
      }
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid video ID format.') {
        return res.status(400).json({ message: err.message });
      }
      if (err.message === 'Video not found') {
        return res.status(404).json({ message: err.message });
      }
      if (err.message === 'Unauthorized') {
        return res.status(403).json({ message: err.message });
      }
      if (err.message === 'Rate limit exceeded') {
        return res.status(429).json({ message: err.message });
      }
    }
    next(err);
  }
});

// Generate flashcards
router.post('/:id/generate-flashcards', isAuthenticated, async (req: any, res, next) => {
  try {
    const { video, transcript, summaryText } = await validateVideoForGeneration(
      req.params.id, 
      req.user.claims.sub
    );

    const generation = await openai.generateFlashcards(transcript, video.title, summaryText);
    const set = await storage.createFlashcardSet({
      videoId: video.id,
      title: generation.title,
      description: generation.description
    });
    for (const card of generation.flashcards) {
      await storage.createFlashcard({
        flashcardSetId: set.id,
        question: card.question,
        answer: card.answer
      });
    }

    res.status(201).json({ success: true, data: set });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid video ID format.') {
        return res.status(400).json({ message: err.message });
      }
      if (err.message === 'Video not found') {
        return res.status(404).json({ message: err.message });
      }
      if (err.message === 'Unauthorized') {
        return res.status(403).json({ message: err.message });
      }
      if (err.message === 'Rate limit exceeded') {
        return res.status(429).json({ message: err.message });
      }
    }
    next(err);
  }
});

// Generate ideas (blog titles, social hooks, questions)
router.post('/:id/generate-ideas', isAuthenticated, async (req: any, res, next) => {
  try {
    const type = req.query.type as string;
    if (!['blog_titles', 'social_media_hooks', 'questions'].includes(type)) {
      return res.status(400).json({ message: 'Invalid ideas type' });
    }

    const { video, transcript, summaryText } = await validateVideoForGeneration(
      req.params.id, 
      req.user.claims.sub
    );

    let ideas: string[] = [];
    if (type === 'blog_titles') {
      ideas = await openai.generateBlogIdeas(transcript, video.title, summaryText);
    } else if (type === 'social_media_hooks') {
      ideas = await openai.generateSocialMediaHooks(transcript, video.title, summaryText);
    } else {
      ideas = await openai.generateFollowUpQuestions(transcript, video.title, summaryText);
    }

    const set = await storage.createIdeaSet({ videoId: video.id, type });
    for (const idea of ideas) {
      await storage.createIdea({ ideaSetId: set.id, content: idea });
    }

    res.status(201).json({ success: true, data: set });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid video ID format.') {
        return res.status(400).json({ message: err.message });
      }
      if (err.message === 'Video not found') {
        return res.status(404).json({ message: err.message });
      }
      if (err.message === 'Unauthorized') {
        return res.status(403).json({ message: err.message });
      }
      if (err.message === 'Rate limit exceeded') {
        return res.status(429).json({ message: err.message });
      }
    }
    next(err);
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