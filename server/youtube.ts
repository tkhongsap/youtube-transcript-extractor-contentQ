import { YoutubeTranscript } from 'youtube-transcript';
import { z } from "zod";
import { Video } from "@shared/schema";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MIN_VIEWS = 10000;

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: {
      high: { url: string };
    };
    publishedAt: string;
  };
  statistics?: {
    viewCount: string;
  };
}

export async function searchVideos(query: string, category: string, sortBy = "date"): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key not found");
  }

  // Convert category to search query
  const categoryQuery = category === "all" ? "" : category.replace("-", " ");
  const searchQuery = `${query || ""} ${categoryQuery}`.trim();

  // Map sort options to YouTube API parameters
  const sortMapping: Record<string, string> = {
    date: "date",
    rating: "rating",
    viewCount: "viewCount",
    relevance: "relevance",
  };

  // First, search for videos
  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "50", // Get more results to filter by views
    q: searchQuery || categoryQuery || "tech", // Default to tech if no query
    order: sortMapping[sortBy] || "date",
    key: YOUTUBE_API_KEY,
    videoDuration: "medium", // Filter out very short and very long videos
  });

  const searchResponse = await fetch(
    `${YOUTUBE_API_BASE}/search?${searchParams.toString()}`
  );

  if (!searchResponse.ok) {
    throw new Error(`YouTube API error: ${await searchResponse.text()}`);
  }

  const searchData = await searchResponse.json();
  const videoIds = searchData.items.map((item: YouTubeVideo) => item.id.videoId);

  // Then, get video statistics to filter by view count
  const statsParams = new URLSearchParams({
    part: "statistics,snippet",
    id: videoIds.join(","),
    key: YOUTUBE_API_KEY,
  });

  const statsResponse = await fetch(
    `${YOUTUBE_API_BASE}/videos?${statsParams.toString()}`
  );

  if (!statsResponse.ok) {
    throw new Error(`YouTube API error: ${await statsResponse.text()}`);
  }

  const statsData = await statsResponse.json();

  // Filter and transform the videos
  return statsData.items
    .filter((video: YouTubeVideo) => {
      const viewCount = parseInt(video.statistics?.viewCount || "0");
      return viewCount >= MIN_VIEWS;
    })
    .slice(0, 20) // Limit to 20 videos
    .map((video: YouTubeVideo) => ({
      id: video.id.videoId,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      views: parseInt(video.statistics?.viewCount || "0"),
      date: new Date(video.snippet.publishedAt).toLocaleDateString(),
    }));
}

export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(" ");
  } catch (error) {
    throw new Error("Failed to fetch video transcript");
  }
}