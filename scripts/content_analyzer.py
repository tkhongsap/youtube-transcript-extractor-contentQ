import json
from typing import Dict, List, Any
from .ai_providers import get_ai_provider

def analyze_hooks(transcript: str, provider: str = "deepseek") -> List[str]:
    """Generate attention-grabbing hooks from the transcript."""
    ai = get_ai_provider(provider)
    
    prompt = [
        {"role": "system", "content": "You are an expert at creating engaging video hooks. Generate 5 attention-grabbing hooks based on the transcript provided."},
        {"role": "user", "content": f"Generate 5 engaging hooks from this transcript. Each hook should be concise and compelling:\n\n{transcript}"}
    ]
    
    try:
        response = ai.generate_completion(prompt)
        # Extract hooks from the response
        hooks = [line.strip() for line in response.split('\n') if line.strip()]
        return hooks[:5]  # Ensure we only return 5 hooks
    except Exception as e:
        raise Exception(f"Failed to generate hooks: {str(e)}")

def generate_summary(transcript: str, provider: str = "deepseek") -> str:
    """Generate a concise summary of the transcript."""
    ai = get_ai_provider(provider)
    
    prompt = [
        {"role": "system", "content": "You are an expert at creating clear and concise video summaries."},
        {"role": "user", "content": f"Create a clear, well-structured summary of this transcript. Focus on the main points and key takeaways:\n\n{transcript}"}
    ]
    
    try:
        return ai.generate_completion(prompt)
    except Exception as e:
        raise Exception(f"Failed to generate summary: {str(e)}")

def create_flashcards(transcript: str, provider: str = "deepseek") -> List[Dict[str, str]]:
    """Generate study flashcards from the transcript."""
    ai = get_ai_provider(provider)
    
    prompt = [
        {"role": "system", "content": "You are an expert at creating educational flashcards. Create 5 question-answer pairs based on the key concepts in the transcript."},
        {"role": "user", "content": f"Create 5 flashcards (question-answer pairs) from this transcript. Focus on the most important concepts:\n\n{transcript}"}
    ]
    
    try:
        response = ai.generate_completion(prompt)
        
        # Parse the response into structured flashcards
        flashcards = []
        qa_pairs = response.split('\n\n')
        
        for pair in qa_pairs:
            if 'Q:' in pair and 'A:' in pair:
                q, a = pair.split('A:')
                question = q.replace('Q:', '').strip()
                answer = a.strip()
                flashcards.append({"question": question, "answer": answer})
        
        return flashcards[:5]  # Ensure we only return 5 flashcards
    except Exception as e:
        raise Exception(f"Failed to generate flashcards: {str(e)}")

def analyze_content(transcript: str, provider: str = "deepseek") -> Dict[str, Any]:
    """Analyze the transcript and generate all content types."""
    try:
        hooks = analyze_hooks(transcript, provider)
        summary = generate_summary(transcript, provider)
        flashcards = create_flashcards(transcript, provider)
        
        return {
            "hooks": hooks,
            "summary": summary,
            "flashcards": flashcards,
        }
    except Exception as e:
        raise Exception(f"Content analysis failed: {str(e)}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Please provide transcript and provider name as arguments"}))
        sys.exit(1)
    
    try:
        transcript = sys.argv[1]
        provider = sys.argv[2]
        result = analyze_content(transcript, provider)
        print(json.dumps({"success": True, "data": result}))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
