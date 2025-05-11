import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not found in environment variables. AI features will not work correctly.");
}

if (!process.env.OPENAI_MODEL) {
  console.warn("OPENAI_MODEL not found in environment variables. Using default model.");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-development'
});

// The model to use for OpenAI API calls, read from environment variable with fallback to "gpt-4o"
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export async function generateVideoSummary(transcript: string, title: string = ""): Promise<{summary: string, keyTopics: string[]}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert content analyst specialized in creating detailed summaries from video transcripts. Generate a comprehensive, well-structured summary that extracts key points and insights from the provided transcript. Include main arguments, important facts, and central themes. Format the summary in clear paragraphs with proper structure."
        },
        {
          role: "user",
          content: `Create a comprehensive summary of this video transcript${title ? ` about "${title}"` : ""}. Also identify and list the key topics discussed in the video as an array of topic names. Structure your response as a JSON object with 'summary' and 'keyTopics' fields.\n\nTranscript:\n${transcript}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      summary: result.summary,
      keyTopics: result.keyTopics
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary from transcript");
  }
}

export async function generateMediumReport(transcript: string, title: string = "", summary: string = ""): Promise<{title: string, content: string}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert content writer specializing in Medium-style articles. Create engaging, informative, and well-structured articles based on video transcripts. Your articles should follow Medium's style with clear headings, short paragraphs, and a conversational yet professional tone."
        },
        {
          role: "user",
          content: `Write a Medium-style article based on this video${title ? ` titled "${title}"` : ""}. ${summary ? `Here's a summary to guide you: ${summary}` : ""}\n\nTranscript:\n${transcript}\n\nRespond with a JSON object containing a creative 'title' for the article and the article 'content'.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      title: result.title,
      content: result.content
    };
  } catch (error) {
    console.error("Error generating Medium report:", error);
    throw new Error("Failed to generate Medium-style report");
  }
}

export async function generateLinkedInPost(transcript: string, title: string = "", summary: string = ""): Promise<{title: string, content: string}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert in LinkedIn content creation. Create professional, concise, and engagement-focused posts that follow LinkedIn best practices. Your posts should be scannable, include professional insights, and prompt engagement through questions or calls to action."
        },
        {
          role: "user",
          content: `Write a LinkedIn post based on this video${title ? ` titled "${title}"` : ""}. ${summary ? `Here's a summary to guide you: ${summary}` : ""}\n\nTranscript:\n${transcript}\n\nRespond with a JSON object containing a catchy 'title' for the post and the post 'content'.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      title: result.title,
      content: result.content
    };
  } catch (error) {
    console.error("Error generating LinkedIn post:", error);
    throw new Error("Failed to generate LinkedIn-style post");
  }
}

export async function generateFlashcards(transcript: string, title: string = "", summary: string = ""): Promise<{title: string, description: string, flashcards: {question: string, answer: string}[]}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are an educational content expert specializing in creating effective flashcards for learning and retention. Create clear, concise flashcards that capture key concepts, definitions, and facts from educational content."
        },
        {
          role: "user",
          content: `Create a set of educational flashcards based on this video${title ? ` titled "${title}"` : ""}. ${summary ? `Here's a summary to guide you: ${summary}` : ""}\n\nTranscript:\n${transcript}\n\nRespond with a JSON object containing a descriptive 'title' for the flashcard set, a brief 'description', and an array of 'flashcards' objects, each with 'question' and 'answer' fields. Create between 8-12 flashcards that cover the most important concepts.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      title: result.title,
      description: result.description,
      flashcards: result.flashcards
    };
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error("Failed to generate flashcards");
  }
}

export async function generateBlogIdeas(transcript: string, title: string = "", summary: string = ""): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a content strategist specializing in blog content ideation. Generate engaging, SEO-friendly blog title ideas based on video content."
        },
        {
          role: "user",
          content: `Generate a list of 5-7 blog title ideas based on this video${title ? ` titled "${title}"` : ""}. ${summary ? `Here's a summary to guide you: ${summary}` : ""}\n\nTranscript:\n${transcript}\n\nRespond with a JSON object containing an array of blog title ideas in the 'titles' field.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.titles;
  } catch (error) {
    console.error("Error generating blog ideas:", error);
    throw new Error("Failed to generate blog title ideas");
  }
}

export async function generateSocialMediaHooks(transcript: string, title: string = "", summary: string = ""): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a social media content specialist. Create engaging, scroll-stopping hooks and content ideas optimized for social media platforms based on video content."
        },
        {
          role: "user",
          content: `Generate a list of 5-7 engaging social media hooks or post ideas based on this video${title ? ` titled "${title}"` : ""}. ${summary ? `Here's a summary to guide you: ${summary}` : ""}\n\nTranscript:\n${transcript}\n\nRespond with a JSON object containing an array of social media hook ideas in the 'hooks' field.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.hooks;
  } catch (error) {
    console.error("Error generating social media hooks:", error);
    throw new Error("Failed to generate social media hooks");
  }
}

export async function generateFollowUpQuestions(transcript: string, title: string = "", summary: string = ""): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a content researcher specializing in identifying logical follow-up questions that can deepen understanding or expand on topics covered in videos."
        },
        {
          role: "user",
          content: `Generate a list of 5-7 thoughtful follow-up questions based on this video${title ? ` titled "${title}"` : ""}. ${summary ? `Here's a summary to guide you: ${summary}` : ""}\n\nTranscript:\n${transcript}\n\nRespond with a JSON object containing an array of questions in the 'questions' field.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.questions;
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    throw new Error("Failed to generate follow-up questions");
  }
}

export async function transcribeFromAudio(audioUrl: string): Promise<string> {
  // This is a placeholder function since we'll be using YouTube's captions
  // In a real implementation, this would use OpenAI's Whisper API
  throw new Error("Direct audio transcription not implemented");
}
