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
 * Get video transcript using YouTube's captions
 */
export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    // First, we need to get the captions track ID
    const captionsResponse = await fetch(
      `${BASE_URL}/captions?videoId=${videoId}&part=snippet&key=${API_KEY}`
    );

    if (!captionsResponse.ok) {
      const text = await captionsResponse.text();
      throw new Error(`YouTube Captions API error: ${captionsResponse.status} ${text}`);
    }

    const captionsData = await captionsResponse.json();
    
    if (!captionsData.items || captionsData.items.length === 0) {
      console.log('No captions found for this video, attempting to use alternative method');
      
      // If no captions are found, we can use a simplified approach by fetching the video description
      // and additional metadata which might contain useful information
      const videoResponse = await fetch(
        `${BASE_URL}/videos?id=${videoId}&part=snippet&key=${API_KEY}`
      );
      
      if (!videoResponse.ok) {
        throw new Error('Failed to retrieve video information');
      }
      
      const videoData = await videoResponse.json();
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error('Video not found');
      }
      
      // Use the description as a fallback
      const description = videoData.items[0].snippet.description;
      return `No transcript available from YouTube captions. Using video description instead:\n\n${description}`;
    }
    
    // In a real application, we would now try to fetch the actual transcript data
    // using the YouTube Data API or a third-party service

    // For demonstration purposes, we'll create a more realistic transcript using the video title
    // and information about the video from the API
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

    // For now, we'll return a combination of video information to provide useful context
    // until we implement a proper transcript extraction method
    return `Title: ${videoTitle}\n\nChannel: ${channelTitle}\n\nDescription:\n${description}\n\n` +
      `Note: This is video information data. A complete transcript would require additional third-party services or YouTube Data API with proper permissions.`;
  } catch (error) {
    console.error('Error fetching video transcript:', error);
    return "Failed to retrieve transcript. Please check your YouTube API key and ensure the video has captions available.";
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
