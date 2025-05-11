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
    const response = await fetch(
      `${BASE_URL}/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${API_KEY}`
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`YouTube API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
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
    console.error('Error fetching video details:', error);
    throw error;
  }
}

/**
 * Get video transcript using a specialized package for YouTube transcripts
 */
export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    // Import the YouTube transcript module
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    console.log(`Fetching transcript for video ID: ${videoId}`);
    
    // Get the detailed transcript using the proper class method
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId);
    
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
      const videoInfoResponse = await fetch(
        `${BASE_URL}/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`
      );
      
      if (!videoInfoResponse.ok) {
        throw new Error('Failed to retrieve video info');
      }
      
      const videoInfo = await videoInfoResponse.json();
      const videoTitle = videoInfo.items[0].snippet.title;
      const channelTitle = videoInfo.items[0].snippet.channelTitle;
      
      const formattedTranscript = 
        `Title: ${videoTitle}\n` +
        `Channel: ${channelTitle}\n\n` +
        `Full Transcript:\n\n${paragraphs.join('\n\n')}`;
        
      return formattedTranscript;
    } else {
      throw new Error('No transcript segments found');
    }
  } catch (error) {
    console.error('Error fetching video transcript:', error);
    
    // Fallback to basic information if transcript retrieval fails
    try {
      const videoInfoResponse = await fetch(
        `${BASE_URL}/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`
      );
      
      if (!videoInfoResponse.ok) {
        throw new Error('Failed to retrieve video info');
      }
      
      const videoInfo = await videoInfoResponse.json();
      const videoTitle = videoInfo.items[0].snippet.title;
      const channelTitle = videoInfo.items[0].snippet.channelTitle;
      const description = videoInfo.items[0].snippet.description;
      
      return `Title: ${videoTitle}\n\nChannel: ${channelTitle}\n\n` +
        `Description:\n${description}\n\n` +
        `Note: Unable to retrieve the full transcript for this video. ` +
        `This could be due to unavailable captions or regional restrictions.`;
    } catch (secondaryError) {
      return "Failed to retrieve transcript. The video may not have captions available or there might be regional restrictions.";
    }
  }
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
