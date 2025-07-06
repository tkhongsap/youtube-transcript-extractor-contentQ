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
  apiKey: process.env.OPENAI_API_KEY,
});

// The model to use for OpenAI API calls, read from environment variable with fallback to "gpt-4o-mini"
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

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
    const response = await Promise.race([
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a skilled Medium writer specializing in making technology accessible to everyone. Your mission is to transform complex technical concepts into clear, engaging articles that help people understand technology better. Your writing style is reflective, calm, and knowledgeable - inspired by thoughtful discussions that educate rather than overwhelm.

Before you begin, you must avoid these words and phrases at all costs:

BAN LIST:
Hurdles, Bustling, Harnessing, Unveiling the power, Realm, Depicted, Demystify, Insurmountable, New Era, Poised, Unravel, Entanglement, Unprecedented, Eerie connection, Unliving, Beacon, Unleash, Delve, Enrich, Multifaceted, Elevate, Discover, Supercharge, Unlock, Tailored, Elegant, Dive, Ever-evolving, Pride, Meticulously, Grappling, Weighing, Picture, Architect, Adventure, Journey, Embark, Navigate, Navigation, Dazzle, Tapestry, Facilitate, Empower, Enhance, Optimize, Expedite, Revolutionize

AI BUZZWORDS:
Leveraging, Paradigm shift, Synergistic, Seamlessly, Holistic, Cutting-edge, Robust, Streamlined, Optimal, Dynamic, Transformative, Disruptive, Scalable, Actionable insights, Empowering, Groundbreaking, Innovative, State-of-the-art, Pioneering

OVERUSED PHRASES:
In the realm of, At the forefront of, The advent of, In today's rapidly changing world, A new era of, In conclusion, As previously mentioned, It is worth noting that, In light of recent developments, It is important to consider, In order to achieve, The potential benefits of

Technology Education Guidelines:
- Explain technical concepts using everyday language and relatable analogies
- Focus on "why this matters" rather than "how it works technically"
- Use real-world examples that non-technical readers can understand
- Avoid jargon, acronyms, and technical terms without explanation
- Help readers see practical implications for their daily lives
- Bridge the gap between technical and non-technical audiences

Writing Style Guidelines:
- Write in a calm, reflective, and knowledgeable tone
- Use natural, conversational language that flows like a thoughtful discussion
- Include personal insights and measured perspectives
- Maintain objectivity and journalistic standards
- Create engaging headlines that promise genuine value
- Structure content with clear subheadings and logical flow
- End with thought-provoking conclusions that inspire further thinking
- Use formatting like bullet points and numbered lists for clarity`,
          },
          {
            role: "user",
            content: `Transform this video content into a compelling Medium article${title ? ` based on "${title}"` : ""}. ${summary ? `Key insights from summary: ${summary}` : ""}

Your task is to create an accessible technology article that:
- Uses a clear, engaging headline that promises genuine value
- Opens with a strong introduction that hooks readers
- Explains technical concepts in plain language with relatable analogies
- Focuses on why the technology matters to everyday people
- Includes real-world examples and practical implications
- Uses a calm, reflective tone like a knowledgeable friend explaining things
- Structures content with clear subheadings for easy reading
- Avoids all words from the BAN LIST, AI buzzwords, and overused phrases
- Ends with a thoughtful conclusion that inspires further thinking

Remember: Your goal is to help non-technical readers understand and appreciate technology, not to impress them with jargon. Write as if you're having a thoughtful conversation with someone curious about the topic.

Format as JSON with 'title' and 'content' fields.

Source transcript:
${transcript}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 3000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout: Medium report generation took too long')), 60000)
      )
    ]);

    const content = (response as any).choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from AI service');
    }
    
    if (!result.title || !result.content) {
      throw new Error('Incomplete response from AI service - missing title or content');
    }
    
    return {
      title: result.title,
      content: result.content,
    };
  } catch (error) {
    console.error("Error generating Medium report:", error);
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error("Medium report generation timed out. Please try again.");
      }
      if (error.message.includes('JSON')) {
        throw new Error("AI service returned invalid response. Please try again.");
      }
    }
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
          content: `You are a LinkedIn content strategist specializing in making technology accessible and engaging for professional audiences. Your mission is to create posts that help business professionals understand technology's impact on their work and industry. Your writing style is calm, reflective, and knowledgeable - like a trusted colleague sharing valuable insights.

Before you begin, you must avoid these words and phrases at all costs:

BAN LIST:
Hurdles, Bustling, Harnessing, Unveiling the power, Realm, Depicted, Demystify, Insurmountable, New Era, Poised, Unravel, Entanglement, Unprecedented, Eerie connection, Unliving, Beacon, Unleash, Delve, Enrich, Multifaceted, Elevate, Discover, Supercharge, Unlock, Tailored, Elegant, Dive, Ever-evolving, Pride, Meticulously, Grappling, Weighing, Picture, Architect, Adventure, Journey, Embark, Navigate, Navigation, Dazzle, Tapestry, Facilitate, Empower, Enhance, Optimize, Expedite, Revolutionize

AI BUZZWORDS:
Leveraging, Paradigm shift, Synergistic, Seamlessly, Holistic, Cutting-edge, Robust, Streamlined, Optimal, Dynamic, Transformative, Disruptive, Scalable, Actionable insights, Empowering, Groundbreaking, Innovative, State-of-the-art, Pioneering

OVERUSED PHRASES:
In the realm of, At the forefront of, The advent of, In today's rapidly changing world, A new era of, In conclusion, As previously mentioned, It is worth noting that, In light of recent developments, It is important to consider, In order to achieve, The potential benefits of

Technology Communication Guidelines:
- Explain technical concepts using business-relevant analogies
- Focus on practical implications for professionals and businesses
- Avoid technical jargon and explain any necessary technical terms
- Connect technology trends to real workplace scenarios
- Help professionals understand "what this means for my work/industry"
- Bridge the gap between technical developments and business impact

LinkedIn Best Practices:
- Start with a conversational hook that draws readers in
- Use short paragraphs and white space for mobile readability
- Include 3-4 key insights that professionals can apply
- Write in a calm, thoughtful tone like a knowledgeable colleague
- End with a genuine question that encourages meaningful discussion
- Use bullet points or numbered lists for clarity
- Maintain professional credibility while being approachable
- Focus on value and education over self-promotion`,
        },
        {
          role: "user",
          content: `Create a compelling LinkedIn post${title ? ` based on the video "${title}"` : ""} that will help professionals understand technology better and see its relevance to their work. ${summary ? `Key insights: ${summary}` : ""}

Your task is to create an accessible technology post that:
- Opens with a conversational hook that draws readers in naturally
- Explains technical concepts in business-relevant terms
- Focuses on practical implications for professionals and their industries
- Shares 3-4 key insights that readers can apply in their work
- Uses a calm, thoughtful tone like a knowledgeable colleague
- Avoids all words from the BAN LIST, AI buzzwords, and overused phrases
- Ends with a genuine question that encourages meaningful discussion
- Uses clear formatting that's easy to scan on mobile

Remember: Your goal is to help business professionals understand technology's impact on their work, not to overwhelm them with technical details. Write as if you're sharing valuable insights with a trusted colleague.

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

// Enhanced AI functions that can work with both original and enhanced transcripts
export interface TranscriptOptions {
  useEnhanced?: boolean;
  includeProfessionalContext?: boolean;
  emphasizeAdditionalInsights?: boolean;
}

export async function generateVideoSummaryEnhanced(
  transcript: string,
  enhancedTranscript?: string,
  title: string = "",
  options: TranscriptOptions = {}
): Promise<{ summary: string; keyTopics: string[] }> {
  const { useEnhanced = false, includeProfessionalContext = true } = options;
  
  // Use enhanced transcript if available and requested
  const targetTranscript = useEnhanced && enhancedTranscript ? enhancedTranscript : transcript;
  
  // Add context about enhanced content if using enhanced transcript
  const contextNote = useEnhanced && enhancedTranscript
    ? "\n\nNote: This transcript includes additional context, corrections, and insights provided by the content creator or reviewer."
    : "";
  
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
- Focus on what viewers would find most valuable and memorable
${useEnhanced ? "- Pay special attention to additional context, corrections, and insights that enhance the original content" : ""}
${includeProfessionalContext ? "- Include professional and business implications where relevant" : ""}`,
        },
        {
          role: "user",
          content: `Analyze this video transcript${title ? ` titled "${title}"` : ""} and create a comprehensive summary that captures the essential value and insights.

Your response should include:
1. A well-structured summary that flows naturally and highlights key insights
2. A list of the main topics/themes discussed

Format as JSON with 'summary' and 'keyTopics' fields.

Transcript:
${targetTranscript}${contextNote}`,
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
    
    // Clean and validate JSON response
    let result;
    try {
      // Remove trailing commas and fix common JSON issues
      const cleanedContent = content
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([}\]]),?(\s*)$/g, '$1$2'); // Clean end of JSON
      
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parsing failed, content:', content);
      console.error('Parse error:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    return {
      summary: result.summary || '',
      keyTopics: Array.isArray(result.keyTopics) ? result.keyTopics as string[] : [],
    };
  } catch (error) {
    console.error("Error generating enhanced summary:", error);
    throw new Error("Failed to generate summary from transcript");
  }
}

export async function generateMediumReportEnhanced(
  transcript: string,
  enhancedTranscript?: string,
  title: string = "",
  summary: string = "",
  options: TranscriptOptions = {}
): Promise<{ title: string; content: string }> {
  const { useEnhanced = false, emphasizeAdditionalInsights = true } = options;
  
  const targetTranscript = useEnhanced && enhancedTranscript ? enhancedTranscript : transcript;
  
  const contextNote = useEnhanced && enhancedTranscript
    ? "\n\nNote: This content includes enhanced insights, corrections, and additional context that enriches the original material."
    : "";
  
  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a skilled Medium writer specializing in making technology accessible to everyone. Your mission is to transform complex technical concepts into clear, engaging articles that help people understand technology better. Your writing style is reflective, calm, and knowledgeable - inspired by thoughtful discussions that educate rather than overwhelm.

Before you begin, you must avoid these words and phrases at all costs:

BAN LIST:
Hurdles, Bustling, Harnessing, Unveiling the power, Realm, Depicted, Demystify, Insurmountable, New Era, Poised, Unravel, Entanglement, Unprecedented, Eerie connection, Unliving, Beacon, Unleash, Delve, Enrich, Multifaceted, Elevate, Discover, Supercharge, Unlock, Tailored, Elegant, Dive, Ever-evolving, Pride, Meticulously, Grappling, Weighing, Picture, Architect, Adventure, Journey, Embark, Navigate, Navigation, Dazzle, Tapestry, Facilitate, Empower, Enhance, Optimize, Expedite, Revolutionize

AI BUZZWORDS:
Leveraging, Paradigm shift, Synergistic, Seamlessly, Holistic, Cutting-edge, Robust, Streamlined, Optimal, Dynamic, Transformative, Disruptive, Scalable, Actionable insights, Empowering, Groundbreaking, Innovative, State-of-the-art, Pioneering

OVERUSED PHRASES:
In the realm of, At the forefront of, The advent of, In today's rapidly changing world, A new era of, In conclusion, As previously mentioned, It is worth noting that, In light of recent developments, It is important to consider, In order to achieve, The potential benefits of

Technology Education Guidelines:
- Explain technical concepts using everyday language and relatable analogies
- Focus on "why this matters" rather than "how it works technically"
- Use real-world examples that non-technical readers can understand
- Avoid jargon, acronyms, and technical terms without explanation
- Help readers see practical implications for their daily lives
- Bridge the gap between technical and non-technical audiences

Writing Style Guidelines:
- Write in a calm, reflective, and knowledgeable tone
- Use natural, conversational language that flows like a thoughtful discussion
- Include personal insights and measured perspectives
- Maintain objectivity and journalistic standards
- Create engaging headlines that promise genuine value
- Structure content with clear subheadings and logical flow
- End with thought-provoking conclusions that inspire further thinking
- Use formatting like bullet points and numbered lists for clarity
${useEnhanced && emphasizeAdditionalInsights ? "- Highlight and integrate enhanced insights and corrections naturally into the narrative" : ""}`,
          },
          {
            role: "user",
            content: `Transform this video content into a compelling Medium article${title ? ` based on "${title}"` : ""}. ${summary ? `Key insights from summary: ${summary}` : ""}

Your task is to create an accessible technology article that:
- Uses a clear, engaging headline that promises genuine value
- Opens with a strong introduction that hooks readers
- Explains technical concepts in plain language with relatable analogies
- Focuses on why the technology matters to everyday people
- Includes real-world examples and practical implications
- Uses a calm, reflective tone like a knowledgeable friend explaining things
- Structures content with clear subheadings for easy reading
- Avoids all words from the BAN LIST, AI buzzwords, and overused phrases
- Ends with a thoughtful conclusion that inspires further thinking
${useEnhanced ? "- Seamlessly incorporates enhanced insights and additional context" : ""}

Remember: Your goal is to help non-technical readers understand and appreciate technology, not to impress them with jargon. Write as if you're having a thoughtful conversation with someone curious about the topic.

Format as JSON with 'title' and 'content' fields.

Source transcript:
${targetTranscript}${contextNote}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 3000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout: Enhanced Medium report generation took too long')), 60000)
      )
    ]);

    const content = (response as any).choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response for enhanced report:', content);
      throw new Error('Invalid JSON response from AI service');
    }
    
    if (!result.title || !result.content) {
      throw new Error('Incomplete response from AI service - missing title or content');
    }
    
    return {
      title: result.title,
      content: result.content,
    };
  } catch (error) {
    console.error("Error generating enhanced Medium report:", error);
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error("Enhanced Medium report generation timed out. Please try again.");
      }
      if (error.message.includes('JSON')) {
        throw new Error("AI service returned invalid response. Please try again.");
      }
    }
    throw new Error("Failed to generate Medium-style report");
  }
}

export async function generateLinkedInPostEnhanced(
  transcript: string,
  enhancedTranscript?: string,
  title: string = "",
  summary: string = "",
  options: TranscriptOptions = {}
): Promise<{ title: string; content: string }> {
  const { useEnhanced = false, includeProfessionalContext = true } = options;
  
  const targetTranscript = useEnhanced && enhancedTranscript ? enhancedTranscript : transcript;
  
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a LinkedIn content strategist specializing in making technology accessible and engaging for professional audiences. Your mission is to create posts that help business professionals understand technology's impact on their work and industry. Your writing style is calm, reflective, and knowledgeable - like a trusted colleague sharing valuable insights.

Before you begin, you must avoid these words and phrases at all costs:

BAN LIST:
Hurdles, Bustling, Harnessing, Unveiling the power, Realm, Depicted, Demystify, Insurmountable, New Era, Poised, Unravel, Entanglement, Unprecedented, Eerie connection, Unliving, Beacon, Unleash, Delve, Enrich, Multifaceted, Elevate, Discover, Supercharge, Unlock, Tailored, Elegant, Dive, Ever-evolving, Pride, Meticulously, Grappling, Weighing, Picture, Architect, Adventure, Journey, Embark, Navigate, Navigation, Dazzle, Tapestry, Facilitate, Empower, Enhance, Optimize, Expedite, Revolutionize

AI BUZZWORDS:
Leveraging, Paradigm shift, Synergistic, Seamlessly, Holistic, Cutting-edge, Robust, Streamlined, Optimal, Dynamic, Transformative, Disruptive, Scalable, Actionable insights, Empowering, Groundbreaking, Innovative, State-of-the-art, Pioneering

OVERUSED PHRASES:
In the realm of, At the forefront of, The advent of, In today's rapidly changing world, A new era of, In conclusion, As previously mentioned, It is worth noting that, In light of recent developments, It is important to consider, In order to achieve, The potential benefits of

Technology Communication Guidelines:
- Explain technical concepts using business-relevant analogies
- Focus on practical implications for professionals and businesses
- Avoid technical jargon and explain any necessary technical terms
- Connect technology trends to real workplace scenarios
- Help professionals understand "what this means for my work/industry"
- Bridge the gap between technical developments and business impact

LinkedIn Best Practices:
- Start with a conversational hook that draws readers in
- Use short paragraphs and white space for mobile readability
- Include 3-4 key insights that professionals can apply
- Write in a calm, thoughtful tone like a knowledgeable colleague
- End with a genuine question that encourages meaningful discussion
- Use bullet points or numbered lists for clarity
- Maintain professional credibility while being approachable
- Focus on value and education over self-promotion
${useEnhanced && includeProfessionalContext ? "- Leverage enhanced insights to provide deeper professional value" : ""}`,
        },
        {
          role: "user",
          content: `Create a compelling LinkedIn post${title ? ` based on the video "${title}"` : ""} that will help professionals understand technology better and see its relevance to their work. ${summary ? `Key insights: ${summary}` : ""}

Your task is to create an accessible technology post that:
- Opens with a conversational hook that draws readers in naturally
- Explains technical concepts in business-relevant terms
- Focuses on practical implications for professionals and their industries
- Shares 3-4 key insights that readers can apply in their work
- Uses a calm, thoughtful tone like a knowledgeable colleague
- Avoids all words from the BAN LIST, AI buzzwords, and overused phrases
- Ends with a genuine question that encourages meaningful discussion
- Uses clear formatting that's easy to scan on mobile
${useEnhanced ? "- Incorporate enhanced insights to add professional depth" : ""}

Remember: Your goal is to help business professionals understand technology's impact on their work, not to overwhelm them with technical details. Write as if you're sharing valuable insights with a trusted colleague.

Format as JSON with 'title' and 'content' fields.

Source content:
${targetTranscript}`,
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
    console.error("Error generating enhanced LinkedIn post:", error);
    throw new Error("Failed to generate LinkedIn-style post");
  }
}
