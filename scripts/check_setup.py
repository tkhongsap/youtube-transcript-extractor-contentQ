import sys
import os
import json
from youtube_transcript_api import YouTubeTranscriptApi

def check_setup():
    setup_info = {
        "python_version": sys.version,
        "youtube_transcript_api_version": YouTubeTranscriptApi.__version__,
        "environment_variables": {
            "NODE_ENV": os.getenv("NODE_ENV"),
            "YOUTUBE_API_KEY": bool(os.getenv("YOUTUBE_API_KEY")),  # Just show if it exists
        },
        "script_path": os.path.abspath(__file__),
        "working_directory": os.getcwd(),
    }
    
    print(json.dumps(setup_info, indent=2))

if __name__ == "__main__":
    check_setup() 