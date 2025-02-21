import sys
import json
import importlib.metadata
import os

def check_environment():
    """Verify all required packages and environment setup."""
    try:
        environment_info = {
            'python_version': sys.version,
            'package_versions': {
                'youtube_transcript_api': importlib.metadata.version('youtube-transcript-api'),
                'requests': importlib.metadata.version('requests'),
                'isodate': importlib.metadata.version('isodate'),
            },
            'environment': {
                'NODE_ENV': os.getenv('NODE_ENV', 'not set'),
                'YOUTUBE_API_KEY': bool(os.getenv('YOUTUBE_API_KEY')),
            },
            'script_path': os.path.abspath(__file__),
            'working_directory': os.getcwd(),
        }

        # Test transcript API functionality
        from youtube_transcript_api import YouTubeTranscriptApi
        test_video_id = "dQw4w9WgXcQ"  # A known working video
        try:
            YouTubeTranscriptApi.get_transcript(test_video_id)
            environment_info['transcript_api_test'] = 'SUCCESS'
        except Exception as e:
            environment_info['transcript_api_test'] = f'FAILED: {str(e)}'

        print(json.dumps(environment_info, indent=2))
        return True

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'status': 'FAILED'
        }, indent=2))
        return False

if __name__ == "__main__":
    success = check_environment()
    sys.exit(0 if success else 1)