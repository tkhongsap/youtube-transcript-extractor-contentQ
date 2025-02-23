import os
import sys
import json
import logging
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import requests
import isodate
import pkg_resources

# Enhanced logging configuration with both file and console output
def setup_logging():
    """Configure logging with both file and console handlers."""
    try:
        # Create logs directory if it doesn't exist
        log_dir = os.path.join(os.getcwd(), 'logs')
        os.makedirs(log_dir, exist_ok=True)

        # Log file path
        log_file = os.path.join(log_dir, 'transcript_extraction.log')

        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stderr),
                logging.FileHandler(log_file)
            ]
        )

        logger = logging.getLogger(__name__)
        logger.info(f"Log file created at: {log_file}")
        return logger
    except Exception as e:
        print(f"Failed to setup logging: {str(e)}", file=sys.stderr)
        raise

# Initialize logging (moved to after setup_logging is defined)

# Added function to verify script environment
def verify_script_environment():
    """Verify script location and Python environment."""
    try:
        # Get script location
        script_path = os.path.abspath(__file__)
        script_dir = os.path.dirname(script_path)
        logger.info(f"Script path: {script_path}")
        logger.info(f"Script directory: {script_dir}")

        # Check if running from correct directory
        expected_dir = os.path.join(os.getcwd(), 'scripts')
        if not script_dir.endswith('scripts'):
            logger.warning(f"Script not running from expected directory: {expected_dir}")

        # Log Python executable info
        logger.info(f"Python executable: {sys.executable}")
        logger.info(f"Python version: {sys.version}")

        # Verify critical directories exist
        required_dirs = ['logs', 'tmp']
        for dir_name in required_dirs:
            dir_path = os.path.join(os.getcwd(), dir_name)
            os.makedirs(dir_path, exist_ok=True)
            logger.info(f"Verified directory exists: {dir_path}")

        # Log script file permissions
        script_stat = os.stat(script_path)
        logger.info(f"Script file permissions: {oct(script_stat.st_mode)}")

        return True
    except Exception as e:
        logger.error(f"Script environment verification failed: {str(e)}")
        return False


def test_api_connectivity():
    """Test YouTube API connectivity and rate limits."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            logger.warning("YOUTUBE_API_KEY not found, skipping API test")
            return False

        logger.info("Testing YouTube API connectivity...")

        # Test video ID (use a known public video)
        test_video_id = 'jNQXAC9IVRw'  # First YouTube video ever

        response = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet",
                "id": test_video_id,
                "key": api_key
            },
            timeout=10
        )

        logger.info(f"API Test Response: Status={response.status_code}, Headers={dict(response.headers)}")

        if response.status_code == 429:
            logger.error("YouTube API rate limit exceeded")
            return False
        elif response.status_code == 403:
            logger.error("YouTube API access forbidden (check API key)")
            return False
        elif response.status_code != 200:
            logger.error(f"YouTube API error: {response.status_code}")
            return False

        # Check remaining quota
        if 'x-quota-remaining' in response.headers:
            quota = response.headers['x-quota-remaining']
            logger.info(f"Remaining API quota: {quota}")

        return True

    except requests.exceptions.RequestException as e:
        logger.error(f"API connectivity test failed: {str(e)}")
        return False

def verify_environment():
    """Verify Python version, packages, and environment variables."""
    try:
        # Log script location and current directory
        script_path = os.path.abspath(__file__)
        logger.info(f"Script location: {script_path}")
        logger.info(f"Current working directory: {os.getcwd()}")

        # Check Python version
        python_version = sys.version_info
        logger.info(f"Python version: {sys.version}")
        if python_version.major != 3 or python_version.minor < 11:
            raise RuntimeError(f"Python 3.11+ required, found {python_version.major}.{python_version.minor}")

        # Verify required packages
        required_packages = {
            'youtube-transcript-api': '0.6.3',
            'requests': '2.31.0',
            'isodate': '0.6.1'
        }

        for package, version in required_packages.items():
            try:
                installed_version = pkg_resources.get_distribution(package).version
                logger.info(f"Package {package}: required={version}, installed={installed_version}")
                if installed_version != version:
                    logger.warning(f"Package version mismatch: {package} {installed_version} (expected {version})")
            except pkg_resources.DistributionNotFound:
                raise RuntimeError(f"Required package not found: {package}")

        # Check network connectivity
        if not test_api_connectivity():
            logger.warning("YouTube API connectivity test failed")

        # Set up and verify temporary directory
        base_dir = os.getcwd()
        tmp_base = os.path.join(base_dir, 'tmp')

        try:
            os.makedirs(tmp_base, mode=0o755, exist_ok=True)
            logger.info(f"Created/verified base tmp directory: {tmp_base}")

            # Get directory permissions and ownership
            tmp_stat = os.stat(tmp_base)
            logger.info(f"Tmp directory permissions: mode={oct(tmp_stat.st_mode)}, uid={tmp_stat.st_uid}, gid={tmp_stat.st_gid}")

            # Test file operations
            test_file = os.path.join(tmp_base, f'test_{os.getpid()}.txt')
            with open(test_file, 'w') as f:
                f.write('test')
            os.unlink(test_file)
            logger.info(f"Successfully verified write permissions in {tmp_base}")

        except Exception as e:
            logger.error(f"Failed to setup/verify tmp directory: {str(e)}")
            raise

        # Log environment variables
        env_vars = ['PYTHONPATH', 'NODE_ENV', 'PATH', 'USER']
        for var in env_vars:
            logger.info(f"{var}: {os.getenv(var, 'Not set')}")

        return tmp_base

    except Exception as e:
        logger.error(f"Environment verification failed: {str(e)}")
        raise RuntimeError(f"Failed to verify environment: {str(e)}")

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL with enhanced validation."""
    try:
        logger.info(f"Processing URL: {youtube_url}")
        if not youtube_url:
            raise ValueError("Empty URL provided")

        parsed_url = urlparse(youtube_url)

        # Handle youtu.be URLs
        if 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/').split('?')[0]
            if not video_id:
                raise ValueError(f"Invalid youtu.be URL format: {youtube_url}")
            logger.info(f"Extracted video ID from youtu.be URL: {video_id}")
            return video_id

        # Handle youtube.com URLs
        if 'youtube.com' in parsed_url.netloc:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                video_id = query_params['v'][0]
                logger.info(f"Extracted video ID from youtube.com URL: {video_id}")
                return video_id
            elif '/v/' in parsed_url.path:
                video_id = parsed_url.path.split('/v/')[1].split('?')[0]
                logger.info(f"Extracted video ID from /v/ path: {video_id}")
                return video_id

            raise ValueError(f"Could not find video ID in URL: {youtube_url}")

        raise ValueError(f"Not a valid YouTube URL: {youtube_url}")

    except Exception as e:
        logger.error(f"Video ID extraction error: {str(e)}")
        raise ValueError(f"Failed to extract video ID: {str(e)}")

def try_get_transcript(video_id: str, languages: list[str], max_retries: int = 3) -> dict:
    """Try multiple methods to get transcript with enhanced error handling and retry logic."""
    errors = []
    retry_delay = 1  # Initial delay in seconds

    for lang in languages:
        retries = 0
        while retries < max_retries:
            try:
                logger.info(f"Attempting to get transcript in {lang} (attempt {retries + 1}/{max_retries})")
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                logger.info(f"Successfully got transcript in {lang}")

                # Validate transcript content
                if not transcript or not isinstance(transcript, list):
                    raise ValueError("Invalid transcript format received")

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
                break  # No point retrying for this language
            except NoTranscriptFound as e:
                error = f"No transcript found for language {lang}: {str(e)}"
                logger.error(error)
                errors.append({"language": lang, "error": error, "type": "NoTranscriptFound"})
                break  # No point retrying for this language
            except requests.exceptions.RequestException as e:
                error = f"Network error getting transcript in {lang}: {str(e)}"
                logger.error(error)
                if retries < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    retries += 1
                    continue
                errors.append({"language": lang, "error": error, "type": "NetworkError"})
            except Exception as e:
                error = f"Unexpected error getting transcript in {lang}: {str(e)}"
                logger.error(error)
                if retries < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    retries += 1
                    continue
                errors.append({"language": lang, "error": error, "type": "UnexpectedError"})
            break  # Exit while loop if we get here (after retries or on non-retriable errors)

    return {
        'success': False,
        'errors': errors
    }

def extract_transcript(video_id: str) -> dict:
    """Extract transcript with enhanced error handling and fallback mechanisms."""
    try:
        logger.info(f"Starting transcript extraction for video ID: {video_id}")

        # First try direct extraction
        languages = ['en', 'en-US', 'en-GB', 'a.en']
        result = try_get_transcript(video_id, languages)

        if result['success']:
            logger.info("Successfully extracted transcript directly")
            return result

        # If direct extraction fails, try listing available transcripts
        try:
            logger.info("Attempting to list available transcripts")
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            if transcript_list:
                available_languages = list(transcript_list.manual_transcripts.keys())
                logger.info(f"Available transcripts: {available_languages}")

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
                            if transcript_data:
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
    """Main function with enhanced process verification."""
    temp_files = []
    try:
        # Verify script environment first
        if not verify_script_environment():
            raise RuntimeError("Failed to verify script environment")

        # Verify environment dependencies
        tmp_dir = verify_environment()
        logger.info(f"Using temporary directory: {tmp_dir}")

        if len(sys.argv) != 2:
            logger.error("Missing YouTube URL argument")
            print(json.dumps({
                "success": False,
                "error": "Missing YouTube URL",
                "errorType": "InvalidInput"
            }))
            sys.exit(1)

        youtube_url = sys.argv[1].strip()
        if not youtube_url:
            raise ValueError("Empty URL provided")

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
    finally:
        # Clean up any temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    logger.info(f"Cleaned up temporary file: {temp_file}")
            except Exception as e:
                logger.warning(f"Failed to clean up {temp_file}: {str(e)}")

if __name__ == "__main__":
    try:
        # Setup logging first
        logger = setup_logging()
        main()
    except Exception as e:
        logger.error(f"Fatal error in script execution: {str(e)}")
        print(json.dumps({
            "success": False,
            "error": str(e),
            "errorType": "FatalError"
        }))
        sys.exit(1)