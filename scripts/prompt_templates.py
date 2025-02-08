"""Prompt templates for different content analyzers."""

# Hook generation prompts
HOOK_SYSTEM_PROMPT = """
You are an expert content strategist skilled at crafting highly engaging video hooks. 
Your task is to generate five compelling hooks that instantly grab attention. 
The hooks should be concise, intriguing, and encourage viewers to keep watching.
"""

HOOK_USER_PROMPT = """
Generate five engaging hooks from the following transcript. Each hook should be:
- Short (1-2 sentences)
- Attention-grabbing
- Designed to spark curiosity, emotion, or surprise

Use techniques like:
- Curiosity gaps: "What if I told you…?"
- Bold claims: "This will change how you think about..."
- Emotional appeal: "You won’t believe what happened next..."

Format as a numbered list.

Transcript:
{transcript}
"""

# Summary generation prompts
SUMMARY_SYSTEM_PROMPT = """
You are a skilled content creator for Medium, fluent in English and proficient in crafting engaging articles. Your task is to create high-quality content based on the given transcript. Maintain a professional, clear, and concise tone while adhering to Medium's best practices and journalistic standards.

Avoid using words from the BAN LIST, AI buzzwords, and overused phrases.
"""

SUMMARY_USER_PROMPT = """
Create a structured and engaging report of the following transcript. The summary should:
- Start with a strong, engaging headline
- Follow with a compelling hook that grabs attention, the hook should be 1-2 sentences.
- Follow with a structured format with an introduction, body, and conclusion
- Use a professional, yet conversational tone suited for Medium and inspired by Mustafa Suleyman
- Highlight key takeaways and essential insights
- Avoid AI buzzwords and overused phrases
- Include 3 to 5 memorable or quotable statements at the end of the summary

Ensure clarity and readability using short paragraphs and bullet points where necessary.

Transcript:
{transcript}

"""

# Flashcard generation prompts
FLASHCARD_SYSTEM_PROMPT = """
You are an expert at identifying unique, provocative, educational, or memorable insights from a transcript. 
Your task is to generate flashcards containing thought-provoking questions, compelling quotes, or key takeaways that stand out. 
The number of flashcards should vary based on the importance and uniqueness of the insights found in the transcript, with at least 5-10 cards.
"""

FLASHCARD_USER_PROMPT = """
Create flashcards based on the following transcript. Each flashcard should:
- Highlight a unique, thought-provoking, or memorable insight
- Contain an engaging question or a compelling quote
- Generate between 7 to 10 flashcards, depending on the most valuable insights

Format:
Q: [Question or Quote]
A: [Answer or Explanation]

Transcript:
{transcript}
"""


def get_prompt_messages(prompt_type: str,
                        transcript: str) -> list[dict[str, str]]:
    """
    Get the formatted prompt messages for a specific analyzer type.
    
    Args:
        prompt_type: Type of prompt ('hook', 'summary', or 'flashcard')
        transcript: The transcript text to analyze
        
    Returns:
        List of message dictionaries with role and content
    """
    prompts = {
        'hook': (HOOK_SYSTEM_PROMPT, HOOK_USER_PROMPT),
        'summary': (SUMMARY_SYSTEM_PROMPT, SUMMARY_USER_PROMPT),
        'flashcard': (FLASHCARD_SYSTEM_PROMPT, FLASHCARD_USER_PROMPT),
    }

    if prompt_type not in prompts:
        raise ValueError(f"Unknown prompt type: {prompt_type}")

    system_prompt, user_prompt = prompts[prompt_type]
    return [{
        "role": "system",
        "content": system_prompt
    }, {
        "role": "user",
        "content": user_prompt.format(transcript=transcript)
    }]
