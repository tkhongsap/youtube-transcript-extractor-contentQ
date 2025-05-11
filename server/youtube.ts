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
 * Note: This is simplified as YouTube's API doesn't directly provide transcripts.
 * A real implementation would use YouTube's captions/subtitles endpoints or a third-party service.
 */
export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    // This is a mock implementation
    // In a real app, you would:
    // 1. Use YouTube's captions API (requires OAuth)
    // 2. Or use a third-party service that can extract captions
    
    // For now, we'll use a simplified approach that would normally fetch captions
    // In production, this would be replaced with actual API calls

    // Simulating an API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // This would be where we'd make the actual API call
    
    // For development purposes, return a placeholder message
    // In production, this would be replaced with the actual transcript
    return "This is a placeholder for the video transcript. In a real implementation, this would be the actual transcript text retrieved from YouTube's captions or a third-party transcription service.";
  } catch (error) {
    console.error('Error fetching video transcript:', error);
    throw new Error('Failed to retrieve video transcript');
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
