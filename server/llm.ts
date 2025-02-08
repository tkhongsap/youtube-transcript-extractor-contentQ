interface AnalysisResult {
  title: string;
  thumbnail: string;
  hooks: string[];
  summary: string;
  flashcards: { question: string; answer: string }[];
  keyPoints: string[];
}

async function analyzeWithDeepseek(transcript: string, model: string): Promise<AnalysisResult> {
  // Mock implementation with model specification
  return {
    title: "Sample Video Title",
    thumbnail: "https://example.com/thumbnail.jpg",
    hooks: ["Hook 1", "Hook 2"],
    summary: "This is a summary of the video content...",
    flashcards: [
      { question: "What is X?", answer: "X is..." }
    ],
    keyPoints: ["Key point 1", "Key point 2"]
  };
}

async function analyzeWithOpenAI(transcript: string, model: string): Promise<AnalysisResult> {
  // Mock implementation with model specification
  return analyzeWithDeepseek(transcript, model);
}

export async function analyzeVideo(
  transcript: string,
  provider: string = "deepseek-r1"
): Promise<AnalysisResult> {
  // Map provider to the appropriate analysis function
  const providerMap: { [key: string]: (transcript: string, model: string) => Promise<AnalysisResult> } = {
    "deepseek-v3": analyzeWithDeepseek,
    "deepseek-r1": analyzeWithDeepseek,
    "gpt-4o-mini": analyzeWithOpenAI,
    "o3-mini": analyzeWithOpenAI
  };

  const analyzeFunction = providerMap[provider];
  if (!analyzeFunction) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return analyzeFunction(transcript, provider);
}