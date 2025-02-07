import { YoutubeTranscript } from 'youtube-transcript';

export async function searchVideos(query: string, category: string) {
  // In a real implementation, this would use the YouTube Data API
  // For now, return mock data
  return [
    {
      id: "video1",
      title: "Understanding Machine Learning",
      thumbnail: "https://i.ytimg.com/vi/example1/maxresdefault.jpg",
      views: 50000,
      date: "2024-02-15"
    },
    // Add more mock videos...
  ];
}

export async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(" ");
  } catch (error) {
    throw new Error("Failed to fetch video transcript");
  }
}
