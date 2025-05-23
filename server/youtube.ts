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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    // Get the detailed transcript using the proper class method
    const transcriptResponse = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => 
          reject(new TranscriptApiError('Transcript request timed out'))
        );
      })
    ]) as any[];
    
    clearTimeout(timeoutId);
    
    // Process the transcript into readable text
    if (transcriptResponse && Array.isArray(transcriptResponse) && transcriptResponse.length > 0) {
      // Map through transcript entries and combine them
      const fullTranscript = transcriptResponse.map(entry => entry.text).join(' ');
      
      // Segment into paragraphs for readability (roughly every 5-6 sentences)
      const sentences = fullTranscript.match(/[^.!?]+[.!?]+/g) || [];
      let paragraphs = [];
      
      for (let i = 0; i < sentences.length; i += 5) {
        const paragraph = sentences.slice(i, i + 5).join(' ');
        paragraphs.push(paragraph);
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
      throw new TranscriptNotFoundError(videoId);
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
        `This could be due to unavailable captions or regional restrictions.`;
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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    // Get the detailed transcript using the proper class method
    const transcriptResponse = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId),
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
      throw new TranscriptNotFoundError(videoId);
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
