import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "OPENAI_API_KEY not found in environment variables. AI features will not work correctly.",
  );
}

if (!process.env.OPENAI_MODEL) {
  console.warn(
    "OPENAI_MODEL not found in environment variables. Using default model.",
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-development",
});

// The model to use for OpenAI API calls, read from environment variable with fallback to "gpt-4o"
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function generateVideoSummary(
  transcript: string,
  title: string = "",
): Promise<{ summary: string; keyTopics: string[] }> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert content analyst with deep expertise in extracting insights from video content. Your summaries are known for their clarity, depth, and actionable insights.

Key guidelines:
- Create comprehensive yet digestible summaries
- Identify core themes, key arguments, and practical takeaways
- Structure content in logical, flowing paragraphs
- Highlight unique insights and valuable information
- Focus on what viewers would find most valuable and memorable`,
        },
        {
          role: "user",
          content: `Analyze this video transcript${title ? ` titled "${title}"` : ""} and create a comprehensive summary that captures the essential value and insights.

Your response should include:
1. A well-structured summary that flows naturally and highlights key insights
2. A list of the main topics/themes discussed

Format as JSON with 'summary' and 'keyTopics' fields.

Transcript:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
    return {
      summary: result.summary,
      keyTopics: Array.isArray(result.keyTopics) ? result.keyTopics as string[] : [],
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary from transcript");
  }
}

export async function generateMediumReport(
  transcript: string,
  title: string = "",
  summary: string = "",
): Promise<{ title: string; content: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a renowned Medium writer known for transforming complex ideas into engaging, accessible articles. Your writing style combines storytelling with insights, making content both informative and compelling.

Writing guidelines:
- Craft attention-grabbing titles that promise value
- Use storytelling elements and personal insights
- Break content into digestible sections with compelling subheadings
- Include practical takeaways and actionable insights
- Write with a conversational yet authoritative tone
- Use formatting like bullet points and numbered lists for clarity
- End with thought-provoking conclusions or calls to action`,
        },
        {
          role: "user",
          content: `Transform this video content into a compelling Medium article${title ? ` based on "${title}"` : ""}. ${summary ? `Key insights from summary: ${summary}` : ""}

Create an article that:
- Has a captivating title that draws readers in
- Tells a story while delivering valuable insights
- Uses clear structure with engaging subheadings
- Includes practical takeaways readers can apply
- Ends with a memorable conclusion

Format as JSON with 'title' and 'content' fields.

Source transcript:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
    return {
      title: result.title,
      content: result.content,
    };
  } catch (error) {
    console.error("Error generating Medium report:", error);
    throw new Error("Failed to generate Medium-style report");
  }
}

export async function generateLinkedInPost(
  transcript: string,
  title: string = "",
  summary: string = "",
): Promise<{ title: string; content: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a LinkedIn content strategist specializing in creating high-engagement professional posts. Your content consistently drives meaningful discussions and builds professional authority.

LinkedIn best practices:
- Start with an attention-grabbing hook in the first line
- Use short paragraphs and white space for readability
- Include 3-5 key insights or takeaways
- Add personal perspective or industry context
- End with an engaging question or call to action
- Use relevant emojis sparingly for visual breaks
- Keep posts scannable with bullet points or numbered lists
- Maintain a professional yet approachable tone`,
        },
        {
          role: "user",
          content: `Create a compelling LinkedIn post${title ? ` based on the video "${title}"` : ""} that will drive engagement and provide professional value. ${summary ? `Key insights: ${summary}` : ""}

Structure the post to:
- Hook readers in the opening line
- Share 3-4 actionable insights or key points
- Include your professional perspective
- End with a question that encourages comments
- Use formatting that's easy to scan on mobile

Format as JSON with 'title' and 'content' fields.

Source content:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
    return {
      title: result.title,
      content: result.content,
    };
  } catch (error) {
    console.error("Error generating LinkedIn post:", error);
    throw new Error("Failed to generate LinkedIn-style post");
  }
}

export async function generateFlashcards(
  transcript: string,
  title: string = "",
  summary: string = "",
): Promise<{
  title: string;
  description: string;
  flashcards: { question: string; answer: string }[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert educational designer specializing in creating effective learning materials. Your flashcards are known for promoting deep understanding and long-term retention.

Flashcard design principles:
- Create clear, specific questions that test understanding
- Write concise but complete answers
- Focus on key concepts, definitions, and practical applications
- Use varied question types (what, why, how, when)
- Include both factual recall and conceptual understanding
- Ensure questions can stand alone without context
- Make answers educational and informative`,
        },
        {
          role: "user",
          content: `Create a comprehensive flashcard set${title ? ` for the video "${title}"` : ""} that will help learners master the key concepts and insights. ${summary ? `Core topics: ${summary}` : ""}

Design 10-15 flashcards that:
- Cover the most important concepts and takeaways
- Progress from basic to more complex ideas
- Include both factual and conceptual questions
- Help reinforce practical applications
- Test true understanding, not just memorization

Format as JSON with:
- 'title': Descriptive title for the flashcard set
- 'description': Brief description of what learners will master
- 'flashcards': Array of question/answer pairs

Source material:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
    return {
      title: result.title,
      description: result.description,
      flashcards: result.flashcards,
    };
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw new Error("Failed to generate flashcards");
  }
}

export async function generateBlogIdeas(
  transcript: string,
  title: string = "",
  summary: string = "",
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a seasoned content strategist and SEO expert known for creating viral blog titles. Your titles consistently drive high click-through rates and engagement.

Title creation principles:
- Use power words that create urgency or curiosity
- Include numbers and specific benefits when relevant
- Promise clear value or transformation
- Target different content angles (how-to, lists, insights, case studies)
- Consider various audience segments and pain points
- Balance clickability with authentic value delivery
- Incorporate trending keywords and topics naturally`,
        },
        {
          role: "user",
          content: `Generate compelling blog title ideas${title ? ` inspired by "${title}"` : ""} that would attract readers and rank well in search engines. ${summary ? `Key insights to work with: ${summary}` : ""}

Create 8-10 diverse blog titles that:
- Appeal to different reader motivations (learning, solving problems, staying current)
- Use varied formats (how-to guides, lists, insights, case studies)
- Promise specific, valuable outcomes
- Include engaging hooks and power words
- Target different skill levels or audience segments

Format as JSON with an array of titles in the 'titles' field.

Source content:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
    return result.titles;
  } catch (error) {
    console.error("Error generating blog ideas:", error);
    throw new Error("Failed to generate blog title ideas");
  }
}

export async function generateSocialMediaHooks(
  transcript: string,
  title: string = "",
  summary: string = "",
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a viral social media content creator with expertise across platforms (Twitter, Instagram, TikTok, Facebook). Your hooks consistently stop the scroll and drive massive engagement.

Hook creation mastery:
- Start with pattern interrupts or surprising statements
- Use curiosity gaps that make people need to know more
- Include specific numbers, timelines, or dramatic outcomes
- Create emotional resonance (surprise, inspiration, concern)
- Use power words and action verbs
- Make hooks platform-adaptable
- Promise immediate value or transformation
- Leverage current trends and relatable scenarios`,
        },
        {
          role: "user",
          content: `Create scroll-stopping social media hooks${title ? ` based on "${title}"` : ""} that will drive high engagement across platforms. ${summary ? `Key insights to leverage: ${summary}` : ""}

Generate 8-10 diverse hooks that:
- Stop users mid-scroll with surprising or intriguing openings
- Work across different platforms (Twitter, Instagram, TikTok)
- Promise specific, valuable insights
- Use varied emotional triggers (curiosity, urgency, inspiration)
- Include numbers or specific outcomes where relevant
- Appeal to different audience segments

Format as JSON with an array in the 'hooks' field.

Source material:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
    return result.hooks;
  } catch (error) {
    console.error("Error generating social media hooks:", error);
    throw new Error("Failed to generate social media hooks");
  }
}

export async function generateFollowUpQuestions(
  transcript: string,
  title: string = "",
  summary: string = "",
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a research strategist and content analyst specializing in identifying knowledge gaps and expansion opportunities. Your questions help audiences deepen understanding and explore related concepts.

Question development expertise:
- Identify natural extensions and deeper explorations of covered topics
- Consider practical applications and real-world implications
- Generate questions that bridge to related subjects
- Create questions for different depth levels (beginner to expert)
- Focus on actionable, research-worthy questions
- Consider current trends and emerging developments
- Balance conceptual and practical inquiry angles`,
        },
        {
          role: "user",
          content: `Generate insightful follow-up questions${title ? ` for the video "${title}"` : ""} that would help viewers deepen their understanding and explore related topics. ${summary ? `Key areas covered: ${summary}` : ""}

Create 7-10 questions that:
- Explore natural extensions of the topics discussed
- Address practical applications and implementation
- Consider different perspectives or counterarguments
- Bridge to related subjects and emerging trends
- Appeal to different expertise levels
- Prompt further research and exploration
- Focus on actionable insights and developments

Format as JSON with an array in the 'questions' field.

Source content:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
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
