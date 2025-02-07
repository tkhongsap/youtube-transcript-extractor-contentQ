import { YoutubeTranscript } from 'youtube-transcript';
import { Video } from "@shared/schema";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

type SortOption = "date" | "relevance" | "rating" | "viewCount";

export async function searchVideos(query: string = "", topic: string = "all", sortBy: SortOption = "date"): Promise<Video[]> {
  console.log('Search parameters:', { query, topic, sortBy, hasApiKey: !!YOUTUBE_API_KEY });

  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key not found");
  }

  // Build search query by combining user query and topic
  let searchQuery = query;
  if (topic !== "all") {
    const topicTerm = topic
      .split("-")
      .map(word => word.toUpperCase())
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
    maxResults: (50).toString(), // Fetch more results to account for filtering
    key: YOUTUBE_API_KEY,
    type: "video",
    q: searchQuery,
    order: sortBy,
    relevanceLanguage: "en", // Prioritize English content
    videoDuration: "medium", // Filter for medium length videos
  });

  try {
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`);
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
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
      .filter((video: Video) => {
        // Only include videos with at least 10,000 views
        return video.views >= 10000;
      })
      .slice(0, 20); // Return top 20 videos

    console.log(`Found ${videos.length} videos after filtering for topic: ${topic}`);
    return videos;
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return [];
  }
}

export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(" ");
  } catch (error) {
    throw new Error("Failed to fetch video transcript");
  }
}