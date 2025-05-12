
Here are some targeted recommendations:

**1\. Enhance Error Logging and Context within the Transcript Endpoint:**

* **Current:** console.error("Error fetching timestamped transcript:", timestampError); and similar for text.  
* **Suggestion:** Add more specific context to your logs. When an error occurs, knowing which video ID failed and what stage of the fallback it was in can be very helpful.  
  TypeScript  
  // Inside router.get('/:id/transcript', ...)  
  // ...  
  } catch (timestampError) {  
    console.error(\`Error fetching timestamped transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}):\`, timestampError);  
    // ...  
  } catch (textError) {  
    console.error(\`Error fetching text transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}) after timestamped attempt failed:\`, textError);  
    // ...  
  }  
  // ...  
  } else {  
    // This else means video.transcript was null or empty after API calls failed  
    console.warn(\`Unable to retrieve transcript from YouTube API for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}), and no stored transcript was found.\`);  
    return res.status(404).json({ message: "Transcript not available from YouTube and not found in storage." });  
  }  
  // ...  
  } catch (error) {  
    // General error for the whole endpoint  
    console.error(\`General error in /:id/transcript for DB video ID ${req.params.id}:\`, error);  
    res.status(500).json({ message: "Failed to fetch transcript due to a server error." });  
  }

**2\. Standardize the API Response Structure for Transcripts:**

* **Current:** The structure of the JSON response varies slightly depending on the source of the transcript.  
  * timestampedTranscript is returned directly.  
  * Text transcripts (fresh or stored) are returned as { transcript: "..." }.  
* **Suggestion:** Standardize this for consistency. Always return an object, perhaps indicating the format.  
  TypeScript  
  // Inside the 'timestamped' format block:  
  try {  
    const timestampedTranscriptData \= await youtube.getVideoTranscriptWithTimestamps(video.youtubeId);  
    // Assuming timestampedTranscriptData is an array of objects or a structured format  
    return res.json({   
      format: 'timestamped', // Or 'youtube-timestamped'  
      data: timestampedTranscriptData   
    });  
  } catch (timestampError) {  
    // ...  
    // Fallback to text  
    try {  
      const fullTranscriptText \= await youtube.getVideoTranscript(video.youtubeId);  
      return res.json({   
        format: 'text', // Or 'youtube-text'  
        data: { transcript: fullTranscriptText } // or just 'data: fullTranscriptText' if it's a string  
      });  
    } catch (textError) {  
      // ...  
      // Fallback to stored  
      if (video.transcript) {  
        return res.json({   
          format: 'text-stored',   
          data: { transcript: video.transcript } // or just 'data: video.transcript'  
        });  
      // ...  
  // Similar adjustments for the 'else' block (text format directly)

  // Example for text format directly:  
  } else {  
    try {  
      const fullTranscriptText \= await youtube.getVideoTranscript(video.youtubeId);  
      return res.json({   
        format: 'text', // Or 'youtube-text'  
        data: { transcript: fullTranscriptText } // or just 'data: fullTranscriptText'  
      });  
    } catch (textError) {  
      console.error(\`Error fetching text transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}):\`, textError);  
      if (video.transcript) {  
        console.warn(\`Falling back to stored transcript for YouTube ID ${video.youtubeId} (DB video ID: ${video.id}).\`);  
        return res.json({   
          format: 'text-stored',  
          data: { transcript: video.transcript } // or just 'data: video.transcript'  
        });  
      } else {  
        // ...  
      }  
    }  
  }

  * **Note:** The exact structure of data will depend on what your youtube.getVideoTranscriptWithTimestamps and youtube.getVideoTranscript functions return (e.g., a string, an array of lines with timestamps, etc.). Aim for consistency.

**3\. Define Clear Expectations & Contract for the ../youtube Module (Crucial for Full Transcripts):**

* **This is not a change** *within* **the /:id/transcript endpoint code itself, but a critical instruction for the team maintaining ../youtube.js (or .ts).**  
* **Requirement 1: Completeness:**  
  * youtube.getVideoTranscript(videoId: string): Promise\<string\> MUST return the **entire** available plain text transcript.  
  * youtube.getVideoTranscriptWithTimestamps(videoId: string): Promise\<any\> (define any more specifically, e.g., Promise\<Array\<{text: string, start: number, duration: number}\>\>) MUST return the **entire** available timestamped transcript.  
  * **Action for ../youtube module:** Investigate and implement proper handling of any pagination or chunking mechanisms provided by the YouTube transcript APIs to ensure all parts of a long transcript are fetched and stitched together.  
* **Requirement 2: Error Handling & Propagation:**  
  * The functions in ../youtube should handle API errors from YouTube gracefully.  
  * They should throw distinct, informative errors if a transcript is genuinely unavailable (e.g., "TranscriptDisabledError," "TranscriptNotFoundForLanguageError") versus a network error or API limit error. This allows the calling endpoint to react more intelligently.  
* **Requirement 3: Timeout Implementation:**  
  * All calls to external YouTube APIs within these functions should have reasonable timeouts to prevent indefinite hanging.

**4\. Improve Type Safety for the Route Handler:**

* **Current:** req: any, video object's properties are inferred.  
* **Suggestion:** Define interfaces for Express requests with user context and for your video object.  
  TypeScript  
  import { Request, Response, NextFunction, Router } from 'express'; // Ensure Response, NextFunction are imported if needed elsewhere  
  // ... other imports

  interface AuthenticatedRequest extends Request {  
    user?: { // Make user optional or ensure it's always there post-isAuthenticated  
      claims: {  
        sub: string; // User ID  
        // ... other claims if present  
      };  
    };  
    // If you attach the video object to req in a middleware later:  
    // video?: VideoData;   
  }

  interface VideoData { // Define this based on your storage.createVideo structure  
    id: number;  
    userId: string;  
    youtubeId: string;  
    title: string;  
    channelTitle: string;  
    description: string | null;  
    thumbnailUrl: string | null;  
    duration: string | null; // Or number if you parse it  
    transcript: string | null; // This is the stored one  
  }

  // ...  
  // In your route handler:  
  router.get('/:id/transcript', isAuthenticated, async (req: AuthenticatedRequest, res: Response) \=\> {  
    try {  
      const videoIdParam \= req.params.id;  
      // Validate videoIdParam is a number string before parsing  
      if (\!/^\\d+$/.test(videoIdParam)) {  
        return res.status(400).json({ message: "Invalid video ID format." });  
      }  
      const videoId \= parseInt(videoIdParam, 10);

      // Ensure req.user and req.user.claims exist if isAuthenticated guarantees it  
      if (\!req.user?.claims?.sub) {  
        // This should ideally be caught by isAuthenticated, but as a safeguard:  
        return res.status(401).json({ message: "User information is missing." });  
      }  
      const userId \= req.user.claims.sub;

      const video: VideoData | null \= await storage.getVideo(videoId); // Assume storage.getVideo can return null  
      const format \= (req.query.format as string) || 'text'; // Cast format if sure it's string or handle undefined

      if (\!video) {  
        return res.status(404).json({ message: "Video not found" });  
      }

      if (video.userId \!== userId) {  
        return res.status(403).json({ message: "Unauthorized" });  
      }  
      // ... rest of the logic

**Impact of these Bite-Sized Changes:**

* **Logging:** Easier to debug issues specifically related to transcript fetching.  
* **Response Structure:** More predictable API for clients.  
* **../youtube Module Expectations:** This is the most critical for solving the *core problem* of incomplete transcripts. The team needs to ensure those functions deliver full data.  
* **Type Safety:** Reduces runtime errors and improves developer experience within this endpoint.

By implementing these, the GET /:id/transcript endpoint itself becomes more robust and easier to maintain, while clearly delegating the core responsibility of fetching *complete* transcripts to the ../youtube module.