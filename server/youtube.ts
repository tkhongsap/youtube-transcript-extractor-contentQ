import { YoutubeTranscript } from 'youtube-transcript';
import { Video } from "@shared/schema";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

type SortOption = "date" | "relevance" | "rating" | "viewCount";

export async function searchVideos(query: string = "", topic: string = "all", sortBy: SortOption = "date"): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key not found");
  }

  // Build search query by combining user query and topic
  let searchQuery = query;
  if (topic !== "all") {
    // Convert topic ID to search term (e.g., "ai-ml" -> "AI ML")
    const topicTerm = topic
      .split("-")
      .map(word => word.toUpperCase())
      .join(" ");
    searchQuery = `${searchQuery} ${topicTerm}`.trim();
  }

  const searchUrl = "https://www.googleapis.com/youtube/v3/search";
  const searchParams = new URLSearchParams({
    part: "snippet",
    maxResults: "50", // Fetch more results to account for filtering
    key: YOUTUBE_API_KEY,
    type: "video",
    q: searchQuery || "tech", // Default to tech videos if no query
    order: sortBy,
  });

  try {
    const searchResponse = await fetch(`${searchUrl}?${searchParams}`);

    if (!searchResponse.ok) {
      console.error("YouTube API search response not OK:", searchResponse.status, searchResponse.statusText);
      const errorBody = await searchResponse.text();
      console.error("Error body:", errorBody);
      return [];
    }

    const searchData = await searchResponse.json();

    if (!searchData || !searchData.items || !Array.isArray(searchData.items)) {
      console.error("Unexpected API response structure:", searchData);
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

    if (!videoResponse.ok) {
      console.error("YouTube API video response not OK:", videoResponse.status, videoResponse.statusText);
      const errorBody = await videoResponse.text();
      console.error("Error body:", errorBody);
      return [];
    }

    const videoData = await videoResponse.json();

    return videoData.items
      .map((video: any) => ({
        id: video.id || "",
        title: video.snippet?.title || "",
        thumbnail: video.snippet?.thumbnails?.high?.url || "",
        views: parseInt(video.statistics?.viewCount || "0", 10),
        date: new Date(video.snippet?.publishedAt || "").toLocaleDateString(),
      }))
      .filter((video: Video) => video.views >= 10000)
      .slice(0, 20);

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