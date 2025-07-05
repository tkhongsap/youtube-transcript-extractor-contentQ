import { z } from 'zod';

// YouTube Data API endpoint for video details
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// YouTube API key from environment
const API_KEY = process.env.YOUTUBE_API_KEY || '';

// Regular expressions for extracting YouTube video ID
const ID_REGEXES = [
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  /^([a-zA-Z0-9_-]{11})$/
];

// Error classes for better error handling
export class TranscriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptError';
  }
}

export class TranscriptNotFoundError extends TranscriptError {
  constructor(videoId: string) {
    super(`No transcript available for video ${videoId}`);
    this.name = 'TranscriptNotFoundError';
  }
}

export class TranscriptApiError extends TranscriptError {
  constructor(message: string) {
    super(`YouTube API error: ${message}`);
    this.name = 'TranscriptApiError';
  }
}

export class VideoNotFoundError extends Error {
  constructor(videoId: string) {
    super(`Video not found: ${videoId}`);
    this.name = 'VideoNotFoundError';
  }
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string {
  for (const regex of ID_REGEXES) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  throw new Error('Could not extract video ID from URL');
}

/**
 * Get video details from YouTube API
 */
export async function getVideoDetails(videoId: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(
      `${BASE_URL}/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${API_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`YouTube API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new VideoNotFoundError(videoId);
    }

    const video = data.items[0];
    
    return {
      youtubeId: videoId,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      duration: video.contentDetails.duration, // ISO 8601 duration format
      publishedAt: video.snippet.publishedAt,
    };
  } catch (error) {
    console.error(`Error fetching video details for ${videoId}:`, error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TranscriptApiError('Request timed out');
    }
    throw error;
  }
}

/**
 * Get video transcript using a specialized package for YouTube transcripts
 * Ensures the complete transcript is retrieved
 */
export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    // Import the YouTube transcript module
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    console.log(`Fetching transcript for video ID: ${videoId}`);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Extended to 30 second timeout for large transcripts
    
    // Get the detailed transcript using the proper class method
    // The library handles the YouTube API call to get transcript data
    const transcriptResponse = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en' // Specify English language to ensure we get the main transcript
      }),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => 
          reject(new TranscriptApiError('Transcript request timed out'))
        );
      })
    ]) as any[];
    
    clearTimeout(timeoutId);
    
    // Process the transcript into readable text
    if (transcriptResponse && Array.isArray(transcriptResponse) && transcriptResponse.length > 0) {
      console.log(`Retrieved ${transcriptResponse.length} transcript segments for video ID: ${videoId}`);
      
      // Map through transcript entries and combine them with spaces
      const fullTranscript = transcriptResponse.map(entry => entry.text).join(' ');
      console.log(`Transcript length: ${fullTranscript.length} characters`);
      
      // If we have very little text, try another approach
      if (fullTranscript.length < 50) {
        console.log("Very short transcript detected, trying alternate format");
        // Join with newlines for better separation
        const rawTranscript = transcriptResponse.map(entry => entry.text).join('\n');
        return `Full raw transcript (${transcriptResponse.length} segments):\n\n${rawTranscript}`;
      }
      
      // Segment into paragraphs for readability (roughly every 5-6 sentences)
      const sentences = fullTranscript.match(/[^.!?]+[.!?]+/g) || [];
      console.log(`Detected ${sentences.length} sentences in transcript`);
      
      // If too few sentences were detected, use a different approach
      let paragraphs = [];
      
      if (sentences.length < 10) {
        // Use time-based chunking instead
        console.log("Few sentences detected, using time-based chunking");
        
        // Group segments into paragraphs of roughly 10 segments each
        for (let i = 0; i < transcriptResponse.length; i += 10) {
          const chunk = transcriptResponse.slice(i, i + 10);
          const paragraph = chunk.map(entry => entry.text).join(' ');
          paragraphs.push(paragraph);
        }
      } else {
        // Use sentence-based chunking (original approach)
        for (let i = 0; i < sentences.length; i += 5) {
          const paragraph = sentences.slice(i, i + 5).join(' ');
          paragraphs.push(paragraph);
        }
      }
      
      // Add video information at the beginning
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const videoInfoResponse = await fetch(
          `${BASE_URL}/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!videoInfoResponse.ok) {
          throw new TranscriptApiError('Failed to retrieve video info');
        }
        
        const videoInfo = await videoInfoResponse.json();
        
        if (!videoInfo.items || videoInfo.items.length === 0) {
          throw new VideoNotFoundError(videoId);
        }
        
        const videoTitle = videoInfo.items[0].snippet.title;
        const channelTitle = videoInfo.items[0].snippet.channelTitle;
        
        const formattedTranscript = 
          `Title: ${videoTitle}\n` +
          `Channel: ${channelTitle}\n\n` +
          `Full Transcript:\n\n${paragraphs.join('\n\n')}`;
          
        return formattedTranscript;
      } catch (metadataError) {
        console.error(`Error fetching video metadata for ${videoId}:`, metadataError);
        // If metadata retrieval fails, just return the transcript text
        const formattedTranscript = `Full Transcript:\n\n${paragraphs.join('\n\n')}`;
        return formattedTranscript;
      }
    } else {
      console.log(`No transcript segments found for video ${videoId}, trying fallback strategies`);
      // Try fallback strategies before giving up
      return await getVideoTranscriptWithFallbacks(videoId);
    }
  } catch (error) {
    console.error(`Error fetching video transcript for ${videoId}:`, error);
    
    if (error instanceof TranscriptError) {
      throw error; // Re-throw specific transcript errors
    }
    
    // Fallback to basic information if transcript retrieval fails
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const videoInfoResponse = await fetch(
        `${BASE_URL}/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!videoInfoResponse.ok) {
        throw new TranscriptApiError('Failed to retrieve video info');
      }
      
      const videoInfo = await videoInfoResponse.json();
      
      if (!videoInfo.items || videoInfo.items.length === 0) {
        throw new VideoNotFoundError(videoId);
      }
      
      const videoTitle = videoInfo.items[0].snippet.title;
      const channelTitle = videoInfo.items[0].snippet.channelTitle;
      const description = videoInfo.items[0].snippet.description;
      
      return `Title: ${videoTitle}\n\nChannel: ${channelTitle}\n\n` +
        `Description:\n${description}\n\n` +
        `Note: Unable to retrieve the full transcript for this video. ` +
        `This could be due to:\n` +
        `• Captions are disabled by the video owner\n` +
        `• Regional restrictions prevent access to transcripts\n` +
        `• The video may not have auto-generated captions or manually uploaded subtitles\n` +
        `• Technical issues with the YouTube transcript service\n\n` +
        `Please try again later or contact the video owner about enabling captions.`;
    } catch (secondaryError) {
      if (secondaryError instanceof TranscriptError || secondaryError instanceof VideoNotFoundError) {
        throw secondaryError;
      }
      throw new TranscriptNotFoundError(videoId);
    }
  }
}

/**
 * Get video transcript with timestamps
 * Ensures the complete transcript with timestamps is retrieved
 */
export async function getVideoTranscriptWithTimestamps(videoId: string): Promise<any> {
  try {
    // Import the YouTube transcript module
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    console.log(`Fetching transcript with timestamps for video ID: ${videoId}`);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Extended to 30 second timeout for large transcripts
    
    // Get the detailed transcript using the proper class method with language specification
    const transcriptResponse = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en' // Specify English language to ensure we get the main transcript
      }),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => 
          reject(new TranscriptApiError('Transcript request timed out'))
        );
      })
    ]) as any[];
    
    clearTimeout(timeoutId);
    
    if (transcriptResponse && Array.isArray(transcriptResponse) && transcriptResponse.length > 0) {
      // Get video details for metadata
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const videoInfoResponse = await fetch(
          `${BASE_URL}/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (videoInfoResponse.ok) {
          const videoInfo = await videoInfoResponse.json();
          
          if (!videoInfo.items || videoInfo.items.length === 0) {
            throw new VideoNotFoundError(videoId);
          }
          
          const videoTitle = videoInfo.items[0].snippet.title;
          const channelTitle = videoInfo.items[0].snippet.channelTitle;
          const duration = videoInfo.items[0].contentDetails.duration;
          
          // Return the complete raw transcript data with timestamps and metadata
          return {
            success: true,
            videoId: videoId,
            title: videoTitle,
            channel: channelTitle,
            duration: duration,
            segmentCount: transcriptResponse.length,
            transcript: transcriptResponse.map(entry => ({
              text: entry.text,
              offset: entry.offset,
              duration: entry.duration,
              // Convert milliseconds to readable timestamp (MM:SS)
              timestamp: formatTimestamp(entry.offset)
            }))
          };
        }
      } catch (metadataError) {
        console.error(`Error fetching video metadata for ${videoId}:`, metadataError);
      }
      
      // Fallback without metadata
      return {
        success: true,
        videoId: videoId,
        segmentCount: transcriptResponse.length,
        transcript: transcriptResponse.map(entry => ({
          text: entry.text,
          offset: entry.offset,
          duration: entry.duration,
          timestamp: formatTimestamp(entry.offset)
        }))
      };
    } else {
      console.log(`No transcript segments found for video ${videoId} with timestamps`);
      return {
        success: false,
        error: 'No transcript segments found for this video'
      };
    }
  } catch (error) {
    console.error(`Error fetching video transcript with timestamps for ${videoId}:`, error);
    
    if (error instanceof TranscriptError) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Format milliseconds into a timestamp (MM:SS or HH:MM:SS)
 */
function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Validate YouTube URL
 */
export function isValidYoutubeUrl(url: string): boolean {
  try {
    extractVideoId(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Try to get transcript with multiple fallback strategies
 * This function attempts different approaches to get a transcript
 */
export async function getVideoTranscriptWithFallbacks(videoId: string): Promise<string> {
  console.log(`Attempting fallback strategies for video ${videoId}`);
  
  const strategies = [
    // Strategy 1: Try youtube-transcript-plus library (advanced alternative)
    async () => {
      console.log('Strategy 1: Trying youtube-transcript-plus library');
      
      try {
        const ytpModule = await import('youtube-transcript-plus');
        
        // Try different ways to access the library
        const YtpApi = (ytpModule as any).default || ytpModule || (ytpModule as any).YoutubeTranscriptPlus;
        
        if (!YtpApi || typeof YtpApi.fetchTranscript !== 'function') {
          throw new Error('youtube-transcript-plus API not found');
        }
        
        // Try different language options with the advanced library
        const languageOptions = ['en', 'en-US', undefined]; // undefined for auto-detect
        
        for (const lang of languageOptions) {
          try {
            console.log(`Trying youtube-transcript-plus with language: ${lang || 'auto-detect'}`);
            
            const options = lang ? { lang } : {};
            const result = await YtpApi.fetchTranscript(videoId, options);
            
            console.log(`youtube-transcript-plus result for ${lang || 'auto'}:`, result ? `${result.length} segments` : 'null/undefined');
            
            if (result && Array.isArray(result) && result.length > 0) {
              console.log(`SUCCESS with youtube-transcript-plus (${lang || 'auto'}): Got ${result.length} segments`);
              return result;
            }
          } catch (e: any) {
            console.log(`youtube-transcript-plus failed for ${lang || 'auto'}:`, e?.message || 'Unknown error');
          }
        }
      } catch (importError: any) {
        console.log('Failed to import youtube-transcript-plus:', importError?.message || 'Import error');
      }
      
      throw new Error('youtube-transcript-plus extraction failed');
    },
    
    // Strategy 2: Try the most common English variants with different syntax
    async () => {
      const youtubeTranscript = await import('youtube-transcript');
      console.log('Strategy 2: Trying most common English variants with improved syntax');
      
      // Try different import syntaxes as some versions require .default
      const transcriptApis = [
        youtubeTranscript.YoutubeTranscript,
        (youtubeTranscript as any).default?.YoutubeTranscript,
        (youtubeTranscript as any).default
      ].filter(Boolean);
      
      const commonLanguages = ['en', 'en-US'];
      
      for (const api of transcriptApis) {
        if (!api || !api.fetchTranscript) continue;
        
        console.log('Trying with transcript API variant...');
        
        for (const lang of commonLanguages) {
          try {
            console.log(`Trying language: ${lang} with current API variant`);
            const result = await api.fetchTranscript(videoId, { lang });
            
            console.log(`Result for ${lang}:`, result ? `${result.length} segments` : 'null/undefined');
            
            if (result && Array.isArray(result) && result.length > 0) {
              console.log(`SUCCESS with language ${lang}: Got ${result.length} segments`);
              return result;
            }
          } catch (e: any) {
            console.log(`Language ${lang} with this API variant failed:`, e?.message || 'Unknown error');
          }
        }
      }
      throw new Error('No transcript found with common English variants');
    },
    
    // Strategy 2: Try without language specification (auto-detect)
    async () => {
      const { YoutubeTranscript } = await import('youtube-transcript');
      console.log('Strategy 2: Trying auto-detection without language specification');
      return await YoutubeTranscript.fetchTranscript(videoId);
    },
    
    // Strategy 3: Try with extended language list based on error messages
    async () => {
      const { YoutubeTranscript } = await import('youtube-transcript');
      console.log('Strategy 3: Trying extended language list');
      
      // Extended list including other common variants
      const languages = ['en-GB', 'en-CA', 'en-AU', 'auto'];
      for (const lang of languages) {
        try {
          console.log(`Trying extended language: ${lang}`);
          const result = await YoutubeTranscript.fetchTranscript(videoId, { lang });
          
          if (result && Array.isArray(result) && result.length > 0) {
            console.log(`SUCCESS with extended language ${lang}: Got ${result.length} segments`);
            return result;
          }
        } catch (e: any) {
          console.log(`Extended language ${lang} failed:`, e.message);
          continue;
        }
      }
      throw new Error('No transcript found with extended language list');
    },
    // Strategy 4: Try direct fetch without any options - sometimes works when others fail
    async () => {
      const { YoutubeTranscript } = await import('youtube-transcript');
      console.log('Strategy 4: Trying direct fetch without language specification');
      
      // Sometimes the library works better without any configuration
      const result = await YoutubeTranscript.fetchTranscript(videoId, {});
      console.log('Direct fetch result length:', result?.length || 0);
      
      if (result && Array.isArray(result) && result.length > 0) {
        return result;
      }
      
      throw new Error('Direct fetch returned empty result');
    },
    // Strategy 5: Try with a retry mechanism and timeout
    async () => {
      const { YoutubeTranscript } = await import('youtube-transcript');
      console.log('Trying with retry mechanism...');
      
      // Sometimes the first call fails but a second call works
      let lastError;
      const maxRetries = 3;
      
      for (let retry = 0; retry < maxRetries; retry++) {
        try {
          console.log(`Retry attempt ${retry + 1}/${maxRetries}`);
          
          // Try both with and without language specification
          const attempts = [
            () => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' }),
            () => YoutubeTranscript.fetchTranscript(videoId),
            () => YoutubeTranscript.fetchTranscript(videoId, { lang: 'en-US' })
          ];
          
          for (const attempt of attempts) {
            try {
              const result = await attempt();
              console.log(`Attempt result length: ${result?.length || 0}`);
              
              if (result && Array.isArray(result) && result.length > 0) {
                console.log('SUCCESS: Got transcript with retry mechanism');
                return result;
              }
            } catch (attemptError: any) {
              console.log('Attempt failed:', attemptError?.message || 'Unknown error');
              lastError = attemptError;
            }
          }
          
          // Wait before next retry
          if (retry < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error: any) {
          lastError = error;
          console.log(`Retry ${retry + 1} failed:`, error?.message || 'Unknown error');
        }
      }
      
      throw new Error(`All retry attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }
  ];

  // Track which strategies detected transcripts but failed to extract them
  let detectedAvailableLanguages: string[] = [];
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Trying transcript strategy ${i + 1} for video ${videoId}`);
      const transcript = await strategies[i]();
      
      if (transcript && transcript.length > 0) {
        console.log(`Strategy ${i + 1} succeeded: Retrieved ${transcript.length} segments`);
        
        // Process the transcript using the same logic as getVideoTranscript
        const fullTranscript = transcript.map(entry => entry.text).join(' ');
        
        if (fullTranscript.length > 0) {
          // Create paragraphs
          const sentences = fullTranscript.match(/[^.!?]+[.!?]+/g) || [];
          let paragraphs = [];
          
          if (sentences.length < 10) {
            for (let j = 0; j < transcript.length; j += 10) {
              const chunk = transcript.slice(j, j + 10);
              const paragraph = chunk.map(entry => entry.text).join(' ');
              paragraphs.push(paragraph);
            }
          } else {
            for (let j = 0; j < sentences.length; j += 5) {
              const paragraph = sentences.slice(j, j + 5).join(' ');
              paragraphs.push(paragraph);
            }
          }
          
          // Get video metadata
          try {
            const videoDetails = await getVideoDetails(videoId);
            return `Title: ${videoDetails.title}\nChannel: ${videoDetails.channelTitle}\n\nFull Transcript:\n\n${paragraphs.join('\n\n')}`;
          } catch (metadataError) {
            return `Full Transcript:\n\n${paragraphs.join('\n\n')}`;
          }
        }
      }
         } catch (error: any) {
       console.log(`Strategy ${i + 1} failed:`, error.message);
       continue;
     }
  }
  
  // If all strategies fail, provide a helpful error message
  console.error(`All transcript extraction strategies failed for video ${videoId}`);
  throw new TranscriptNotFoundError(videoId);
}
