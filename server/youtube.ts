import { YoutubeTranscript } from 'youtube-transcript';
import { Video } from "@shared/schema";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, { data: Video[], timestamp: number }>();

type SortOption = "date" | "relevance" | "rating" | "viewCount";

export async function searchVideos(query: string = "", topic: string = "all", sortBy: SortOption = "relevance"): Promise<Video[]> {
  console.log('Search parameters:', { query, topic, sortBy, hasApiKey: !!YOUTUBE_API_KEY });

  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key not found");
  }

  // Generate cache key
  const cacheKey = `${query}-${topic}-${sortBy}`;
  const cachedResult = searchCache.get(cacheKey);

  // Return cached result if valid
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
    console.log('Returning cached results for:', cacheKey);
    return cachedResult.data;
  }

  // Build search query by combining user query and topic
  let searchQuery = query;
  if (topic !== "all") {
    const topicTerm = topic
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    searchQuery = searchQuery ? `${searchQuery} ${topicTerm}` : topicTerm;
  }

  // If no search query and no specific topic, use a default tech-related query
  if (!searchQuery) {
    searchQuery = topic === "all" ? "technology trending" : searchQuery;
  }

  console.log('Final search query:', searchQuery);

  const searchUrl = "https://www.googleapis.com/youtube/v3/search";
  const searchParams = new URLSearchParams({
    part: "snippet",
    maxResults: "12", // Reduced from 40 to save quota
    key: YOUTUBE_API_KEY,
    type: "video",
    q: searchQuery,
    order: sortBy,
    relevanceLanguage: "en",
    videoDuration: "medium",
  });

  try {
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`);
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      if (searchData.error?.code === 403) {
        console.error("YouTube API quota exceeded");
        // Return empty array but don't cache the error
        return [];
      }
      console.error("YouTube API search error:", searchData);
      return [];
    }

    if (!searchData.items?.length) {
      console.log("No videos found in search response");
      return [];
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",");
    const videoUrl = "https://www.googleapis.com/youtube/v3/videos";
    const videoParams = new URLSearchParams({
      part: "statistics,snippet",
      id: videoIds,
      key: YOUTUBE_API_KEY,
    });

    const videoResponse = await fetch(`${videoUrl}?${videoParams}`);
    const videoData = await videoResponse.json();

    if (!videoResponse.ok) {
      console.error("YouTube API videos error:", videoData);
      return [];
    }

    const videos = videoData.items
      .map((video: any) => ({
        id: video.id || "",
        title: video.snippet?.title || "",
        thumbnail: video.snippet?.thumbnails?.high?.url || "",
        views: parseInt(video.statistics?.viewCount || "0", 10),
        date: new Date(video.snippet?.publishedAt || "").toLocaleDateString(),
      }))
      .filter((video: Video) => video.views >= 10000);

    // Cache the results
    searchCache.set(cacheKey, { data: videos, timestamp: Date.now() });

    console.log(`Found ${videos.length} videos after filtering for topic: ${topic}`);
    return videos;
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return [];
  }
}