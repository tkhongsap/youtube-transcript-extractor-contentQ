import { Router } from 'express';
import { storage } from '../storage';
import * as youtube from '../youtube';

const router = Router();

// Development route for updating transcript
router.get('/update-transcript/:videoId', async (req, res, next) => {
  try {
    const videoId = req.params.videoId;
    console.log(`Attempting to update transcript for YouTube video ID: ${videoId}`);
    
    // Get the video from database
    const dbVideoId = 1; // We know this is the ID of our test video
    const dbVideo = await storage.getVideo(dbVideoId);
    
    if (!dbVideo) {
      const error = new Error("Video not found in database");
      (error as any).statusCode = 404;
      return next(error);
    }
    
    try {
      console.log(`Fetching transcript for YouTube video ID: ${videoId}`);
      const transcript = await youtube.getVideoTranscript(videoId);
      console.log(`Successfully fetched transcript. Length: ${transcript.length} characters`);
      
      // Update the video with the new transcript
      await storage.updateVideo(dbVideoId, { transcript });
      
      res.json({ 
        message: "Transcript updated successfully",
        transcriptLength: transcript.length,
        videoId: dbVideoId
      });
    } catch (transcriptError) {
      console.error("Transcript error:", transcriptError);
      
      // Update with a placeholder message
      const fallbackTranscript = "We were unable to retrieve the full transcript for this video due to technical limitations. Please try again later or check if the video has captions available.";
      await storage.updateVideo(dbVideoId, { transcript: fallbackTranscript });
      
      const error = new Error("Failed to update transcript with error");
      (error as any).statusCode = 500;
      (error as any).details = transcriptError instanceof Error ? transcriptError.message : String(transcriptError);
      next(error);
    }
  } catch (error) {
    next(error);
  }
});

export default router;