import { Router } from 'express';
import { storage } from '../storage';
import * as youtube from '../youtube';

const router = Router();

// Development route for updating transcript
router.get('/update-transcript/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    console.log(`Attempting to update transcript for YouTube video ID: ${videoId}`);
    
    // Get the video from database
    const dbVideoId = 1; // We know this is the ID of our test video
    const dbVideo = await storage.getVideo(dbVideoId);
    
    if (!dbVideo) {
      return res.status(404).json({ message: "Video not found in database" });
    }
    
    try {
      // Get new transcript
      console.log("Fetching transcript...");
      const transcript = await youtube.getVideoTranscript(videoId);
      console.log("Transcript fetched successfully");
      
      // Update the video with the new transcript
      console.log("Updating video in database...");
      await storage.updateVideo(dbVideoId, { transcript });
      console.log("Database updated successfully");
      
      res.json({ 
        message: "Transcript updated successfully", 
        transcript_preview: transcript.substring(0, 300) + "..." 
      });
    } catch (transcriptError) {
      console.error("Transcript error:", transcriptError);
      
      // Update with a placeholder message
      const fallbackTranscript = "We were unable to retrieve the full transcript for this video due to technical limitations. Please try again later or check if the video has captions available.";
      await storage.updateVideo(dbVideoId, { transcript: fallbackTranscript });
      
      res.status(500).json({ 
        message: "Failed to update transcript with error",
        error: transcriptError instanceof Error ? transcriptError.message : String(transcriptError)
      });
    }
  } catch (error) {
    console.error("Error in transcript update route:", error);
    res.status(500).json({ 
      message: "Failed to update transcript",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;