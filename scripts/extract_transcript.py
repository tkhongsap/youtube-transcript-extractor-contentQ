import os
import sys
import json
import logging
import tempfile
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import requests
import isodate

# Enhanced logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_environment():
    """Check environment setup and permissions."""
    env_info = {
        'python_version': sys.version,
        'working_dir': os.getcwd(),
        'temp_dir': tempfile.gettempdir(),
        'user': os.getenv('USER'),
        'node_env': os.getenv('NODE_ENV'),
        'path': os.getenv('PATH'),
    }

    logger.info("Environment Check:")
    for key, value in env_info.items():
        logger.info(f"  {key}: {value}")

    # Check temp directory permissions
    temp_dir = tempfile.gettempdir()
    try:
        test_file = Path(temp_dir) / f"test_{os.getpid()}.txt"
        test_file.write_text("test")
        test_file.unlink()
        logger.info(f"Temporary directory {temp_dir} is writable")
    except Exception as e:
        logger.error(f"Temporary directory permission error: {str(e)}")
        raise RuntimeError(f"Cannot write to temporary directory: {str(e)}")

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL."""
    try:
        logger.info(f"Processing URL: {youtube_url}")
        parsed_url = urlparse(youtube_url)

        # Handle youtu.be URLs first
        if 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/').split('?')[0]
            if video_id:
                logger.info(f"Successfully extracted video ID from youtu.be URL: {video_id}")
                return video_id
            raise ValueError(f"Could not extract video ID from youtu.be URL: {youtube_url}")

        # Handle standard youtube.com URLs
        if 'youtube.com' in parsed_url.netloc:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                video_id = query_params['v'][0]
                logger.info(f"Successfully extracted video ID from standard URL: {video_id}")
                return video_id
            elif '/v/' in parsed_url.path:
                video_id = parsed_url.path.split('/v/')[1].split('?')[0]
                logger.info(f"Successfully extracted video ID from /v/ path: {video_id}")
                return video_id
            raise ValueError(f"Could not extract video ID from URL: {youtube_url}")

        raise ValueError(f"Unsupported YouTube URL format: {youtube_url}")

    except Exception as e:
        logger.error(f"Error extracting video ID: {str(e)}")
        raise

def try_get_transcript(video_id: str, languages: list[str]) -> dict:
    """Try multiple methods to get transcript with enhanced error handling."""
    errors = []

    for lang in languages:
        try:
            logger.info(f"Attempting to get transcript in {lang}")
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
            logger.info(f"Successfully got transcript in {lang}")
            return {
                'success': True,
                'transcript': transcript,
                'language': lang,
                'type': 'direct'
            }
        except TranscriptsDisabled as e:
            error = f"Transcripts are disabled for this video: {str(e)}"
            logger.error(error)
            errors.append({"language": lang, "error": error, "type": "TranscriptsDisabled"})
        except NoTranscriptFound as e:
            error = f"No transcript found for language {lang}: {str(e)}"
            logger.error(error)
            errors.append({"language": lang, "error": error, "type": "NoTranscriptFound"})
        except Exception as e:
            error = f"Unexpected error getting transcript in {lang}: {str(e)}"
            logger.error(error)
            errors.append({"language": lang, "error": error, "type": "UnexpectedError"})

    return {
        'success': False,
        'errors': errors
    }

def extract_transcript(video_id: str) -> dict:
    """Extract transcript with enhanced error handling and fallback mechanisms."""
    try:
        logger.info(f"Starting transcript extraction for video ID: {video_id}")

        # First try simple direct extraction
        languages = ['en', 'en-US', 'en-GB', 'a.en']
        result = try_get_transcript(video_id, languages)

        if result['success']:
            logger.info("Successfully extracted transcript directly")
            return result

        # If direct extraction fails, try listing available transcripts
        try:
            logger.info("Attempting to list available transcripts")
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            logger.info(f"Available transcripts: {transcript_list.manual_transcripts.keys()}")

            # Try different transcript types
            for method in ['manual', 'generated', 'translated']:
                for lang in languages:
                    try:
                        if method == 'manual':
                            transcript = transcript_list.find_manually_created_transcript([lang])
                        elif method == 'generated':
                            transcript = transcript_list.find_generated_transcript([lang])
                        else:
                            available = (transcript_list.manual_transcripts or 
                                      transcript_list.generated_transcripts)
                            if available:
                                first_transcript = next(iter(available.values()))
                                transcript = first_transcript.translate('en')
                            else:
                                continue

                        transcript_data = transcript.fetch()
                        logger.info(f"Found {method} transcript in {lang}")
                        return {
                            'success': True,
                            'transcript': transcript_data,
                            'language': lang if method != 'translated' else 'en-translated',
                            'type': method
                        }
                    except Exception as e:
                        logger.error(f"Failed to get {method} transcript in {lang}: {str(e)}")
                        continue

        except Exception as e:
            logger.error(f"Error listing transcripts: {str(e)}")
            if isinstance(e, TranscriptsDisabled):
                return {
                    'success': False,
                    'error': "Transcripts are disabled for this video",
                    'errorType': "TranscriptsDisabled"
                }
            elif isinstance(e, NoTranscriptFound):
                return {
                    'success': False,
                    'error': "No transcripts found for this video",
                    'errorType': "NoTranscriptFound"
                }

        return {
            'success': False,
            'error': "Could not find any available transcripts",
            'errorType': "NoTranscriptFound",
            'details': result.get('errors', [])
        }

    except Exception as e:
        logger.error(f"Fatal error in extract_transcript: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'errorType': "UnknownError"
        }

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata with enhanced error handling."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            logger.warning("YouTube API key not found in environment")
            return {}

        logger.info(f"Fetching metadata for video: {video_id}")
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": api_key
            },
            timeout=10
        )

        response.raise_for_status()
        data = response.json()

        if not data.get("items"):
            logger.error("No metadata items found in response")
            return {}

        video = data["items"][0]
        duration = isodate.parse_duration(video["contentDetails"]["duration"])

        metadata = {
            "title": video["snippet"]["title"],
            "channelTitle": video["snippet"]["channelTitle"],
            "publishedAt": video["snippet"]["publishedAt"],
            "viewCount": video["statistics"]["viewCount"],
            "duration": str(duration).split('.')[0]
        }

        logger.info("Successfully retrieved metadata")
        return metadata

    except requests.exceptions.RequestException as e:
        logger.error(f"Request error in fetch_video_metadata: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Error in fetch_video_metadata: {str(e)}")
        return {}

def main():
    """Main function with enhanced error handling."""
    try:
        # Check environment setup first
        check_environment()

        if len(sys.argv) != 2:
            logger.error("Missing YouTube URL argument")
            print(json.dumps({
                "success": False,
                "error": "Missing YouTube URL",
                "errorType": "InvalidInput"
            }))
            sys.exit(1)

        youtube_url = sys.argv[1]
        logger.info(f"Starting process for URL: {youtube_url}")

        try:
            video_id = extract_video_id(youtube_url)
            result = extract_transcript(video_id)
            metadata = fetch_video_metadata(video_id)

            if result['success']:
                print(json.dumps({
                    "success": True,
                    "transcript": result['transcript'],
                    "language": result['language'],
                    "type": result['type'],
                    "metadata": metadata
                }))
                sys.exit(0)
            else:
                print(json.dumps({
                    "success": False,
                    "error": result.get('error', 'Unknown error occurred'),
                    "errorType": result.get('errorType', 'UnknownError'),
                    "metadata": metadata,
                    "details": result.get('details', [])
                }))
                sys.exit(1)

        except ValueError as e:
            logger.error(f"Invalid URL error: {str(e)}")
            print(json.dumps({
                "success": False,
                "error": str(e),
                "errorType": "InvalidURL"
            }))
            sys.exit(1)

    except Exception as e:
        logger.error(f"Fatal error in main: {str(e)}")
        print(json.dumps({
            "success": False,
            "error": str(e),
            "errorType": "FatalError",
            "details": {
                "type": type(e).__name__,
                "message": str(e)
            }
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()