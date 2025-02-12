import json
import logging
import os
from typing import Dict, List, Any
from ai_providers import get_ai_provider
from prompt_templates import get_prompt_messages

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_hooks(transcript: str, provider: str = "gpt-4o-mini") -> List[str]:
    """Generate attention-grabbing hooks from the transcript."""
    ai = get_ai_provider(provider)
    logger.info(f"Generating hooks using {provider} provider")

    prompt = get_prompt_messages('hook', transcript)

    try:
        response = ai.generate_completion(prompt)
        # Extract hooks from the response and clean up
        hooks = [line.strip() for line in response.split('\n') if line.strip() and not line.strip().isdigit()]
        return hooks[:5]  # Ensure we only return 5 hooks
    except Exception as e:
        logger.error(f"Hook generation failed: {str(e)}")
        raise Exception(f"Failed to generate hooks: {str(e)}")

def generate_summary(transcript: str, provider: str = "gpt-4o-mini") -> str:
    """Generate a concise summary of the transcript."""
    ai = get_ai_provider(provider)
    logger.info(f"Generating summary using {provider} provider")

    prompt = get_prompt_messages('summary', transcript)

    try:
        return ai.generate_completion(prompt)
    except Exception as e:
        logger.error(f"Summary generation failed: {str(e)}")
        raise Exception(f"Failed to generate summary: {str(e)}")

def create_flashcards(transcript: str, provider: str = "gpt-4o-mini") -> List[Dict[str, str]]:
    """Generate study flashcards from the transcript."""
    ai = get_ai_provider(provider)
    logger.info(f"Generating flashcards using {provider} provider")

    prompt = get_prompt_messages('flashcard', transcript)

    try:
        response = ai.generate_completion(prompt)
        logger.info("Processing flashcard response")

        # Parse the response into structured flashcards
        flashcards = []
        current_card = {}

        for line in response.split('\n'):
            line = line.strip()
            if not line:
                continue

            if line.startswith('Q:'):
                if current_card and 'question' in current_card:
                    flashcards.append(current_card)
                    current_card = {}
                current_card['question'] = line[2:].strip()
            elif line.startswith('A:'):
                current_card['answer'] = line[2:].strip()
                if len(flashcards) < 5:
                    flashcards.append(current_card)
                    current_card = {}

        # Ensure we have exactly 5 flashcards
        if not flashcards:
            logger.error("No flashcards were generated from the response")
            raise Exception("Failed to parse flashcards from response")

        return flashcards[:5]
    except Exception as e:
        logger.error(f"Flashcard generation failed: {str(e)}")
        raise Exception(f"Failed to generate flashcards: {str(e)}")

if __name__ == "__main__":
    import sys

    if len(sys.argv) != 4:
        print(json.dumps({"error": "Please provide transcript file path, analysis type, and provider name as arguments"}))
        sys.exit(1)

    try:
        transcript_file = sys.argv[1]
        analysis_type = sys.argv[2]  # 'hooks', 'summary', or 'flashcards'
        provider = sys.argv[3]

        logger.info(f"Processing {analysis_type} with {provider} provider")

        # Read transcript from file
        with open(transcript_file, 'r') as f:
            transcript = f.read()

        result = None
        if analysis_type == "hooks":
            result = analyze_hooks(transcript, provider)
        elif analysis_type == "summary":
            result = generate_summary(transcript, provider)
        elif analysis_type == "flashcards":
            result = create_flashcards(transcript, provider)
        else:
            raise ValueError(f"Unknown analysis type: {analysis_type}")

        print(json.dumps({"success": True, "data": result}))
        sys.exit(0)
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)