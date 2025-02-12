import json
import logging
import os
import sys
from typing import Dict, List, Any
from ai_providers import get_ai_provider
from prompt_templates import get_prompt_messages

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def analyze_hooks(transcript: str, provider: str = "gpt-4o-mini") -> List[str]:
    """Generate attention-grabbing hooks from the transcript."""
    try:
        logger.info(f"Generating hooks using {provider} provider")
        ai = get_ai_provider(provider)
        prompt = get_prompt_messages('hook', transcript)

        response = ai.generate_completion(prompt)
        logger.info("Processing hooks response")

        # Extract hooks from the response and clean up
        hooks = [line.strip() for line in response.split('\n') if line.strip() and not line.strip().isdigit()]
        if not hooks:
            raise Exception("No valid hooks were generated")

        return hooks[:5]  # Ensure we only return 5 hooks
    except Exception as e:
        logger.error(f"Hook generation failed: {str(e)}")
        raise Exception(f"Failed to generate hooks: {str(e)}")

def generate_summary(transcript: str, provider: str = "gpt-4o-mini") -> str:
    """Generate a concise summary of the transcript."""
    try:
        logger.info(f"Generating summary using {provider} provider")
        ai = get_ai_provider(provider)
        prompt = get_prompt_messages('summary', transcript)

        response = ai.generate_completion(prompt)
        if not response.strip():
            raise Exception("Empty summary generated")

        return response
    except Exception as e:
        logger.error(f"Summary generation failed: {str(e)}")
        raise Exception(f"Failed to generate summary: {str(e)}")

def create_flashcards(transcript: str, provider: str = "gpt-4o-mini") -> List[Dict[str, str]]:
    """Generate study flashcards from the transcript."""
    try:
        logger.info(f"Generating flashcards using {provider} provider")
        ai = get_ai_provider(provider)
        prompt = get_prompt_messages('flashcard', transcript)

        response = ai.generate_completion(prompt)
        logger.info("Processing flashcard response")

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
            elif line.startswith('A:') and 'question' in current_card:
                current_card['answer'] = line[2:].strip()
                if len(flashcards) < 5:
                    flashcards.append(current_card)
                    current_card = {}

        if not flashcards:
            raise Exception("No valid flashcards were generated")

        return flashcards[:5]
    except Exception as e:
        logger.error(f"Flashcard generation failed: {str(e)}")
        raise Exception(f"Failed to generate flashcards: {str(e)}")

if __name__ == "__main__":
    try:
        if len(sys.argv) != 5:
            logger.error("Invalid number of arguments")
            raise ValueError("Please provide transcript file path, analysis type, provider name, and output file path as arguments")

        transcript_file = sys.argv[1]
        analysis_type = sys.argv[2]
        provider = sys.argv[3]
        output_file = sys.argv[4]

        logger.info(f"Processing {analysis_type} with {provider} provider using transcript file: {transcript_file}")

        # Read transcript from file
        try:
            with open(transcript_file, 'r', encoding='utf-8') as f:
                transcript = f.read()
                if not transcript.strip():
                    raise Exception("Empty transcript file")
        except Exception as e:
            logger.error(f"Failed to read transcript file: {str(e)}")
            raise Exception(f"Could not read transcript file: {str(e)}")

        # Process based on analysis type
        try:
            if analysis_type == "hooks":
                result = analyze_hooks(transcript, provider)
            elif analysis_type == "summary":
                result = generate_summary(transcript, provider)
            elif analysis_type == "flashcards":
                result = create_flashcards(transcript, provider)
            else:
                raise ValueError(f"Unknown analysis type: {analysis_type}")

            # Write successful result to output file
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({"success": True, "data": result}, f)

            logger.info(f"Successfully generated {analysis_type}")
            sys.exit(0)

        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "success": False, 
                    "error": str(e),
                    "errorType": "AnalysisError"
                }, f)
            sys.exit(1)

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "success": False,
                    "error": f"Fatal error: {str(e)}",
                    "errorType": "FatalError"
                }, f)
        except Exception as write_err:
            logger.error(f"Failed to write error to output file: {str(write_err)}")
        sys.exit(1)