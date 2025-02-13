import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def check_environment():
    environment_info = {
        'python_version': sys.version,
        'youtube_transcript_api_version': YouTubeTranscriptApi.__version__,
        # Add other relevant package versions
    }
    
    print(json.dumps(environment_info, indent=2))
    
    # Test with a known working video ID
    test_video_id = "known_working_video_id"  # Replace with a video ID that works in dev
    try:
        transcript = YouTubeTranscriptApi.get_transcript(test_video_id)
        print("Transcript API test: SUCCESS")
    except Exception as e:
        print(f"Transcript API test: FAILED - {str(e)}")

if __name__ == "__main__":
    check_environment() 