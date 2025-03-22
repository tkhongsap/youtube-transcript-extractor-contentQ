import os
import sys
import json
import logging
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from youtube_transcript_api.formatters import JSONFormatter
import requests
import isodate
import pkg_resources
import random

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

# Initialize logging
logger = setup_logging()

# Define common user agents to rotate through
COMMON_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
]

def get_random_user_agent():
    """Get a random user agent from the common list."""
    return random.choice(COMMON_USER_AGENTS)

# Instead of directly patching the YouTube API internals (which might be unstable),
# let's create our own request function that will be used in our code
def make_browser_like_request(url):
    """Make a request with browser-like headers to avoid anti-scraping measures."""
    headers = {
        'User-Agent': get_random_user_agent(),
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://www.youtube.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    }
    
    logger.info(f"Making browser-like request to: {url}")
    response = requests.get(url, headers=headers)
    return response

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

                # Try listing available transcripts first
                try:
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                    logger.info("Successfully listed available transcripts")

                    # Try different transcript types with more aggressive fallbacks
                    for method in ['manual', 'generated', 'translated', 'fallback']:
                        try:
                            if method == 'manual':
                                transcript = transcript_list.find_manually_created_transcript([lang])
                            elif method == 'generated':
                                transcript = transcript_list.find_generated_transcript([lang])
                            elif method == 'translated':
                                available = (transcript_list.manual_transcripts or
                                         transcript_list.generated_transcripts)
                                if available:
                                    first_transcript = next(iter(available.values()))
                                    transcript = first_transcript.translate('en')
                                else:
                                    continue
                            else:  # fallback method - try direct extraction
                                transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                                if transcript_data:
                                    return {
                                        'success': True,
                                        'transcript': transcript_data,
                                        'language': lang,
                                        'type': 'fallback'
                                    }
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
                            logger.warning(f"Failed to get {method} transcript in {lang}: {str(e)}")
                            continue

                except TranscriptsDisabled as e:
                    # Don't treat TranscriptsDisabled as a fatal error, try fallback methods
                    logger.warning(f"Transcripts marked as disabled, attempting fallback methods: {str(e)}")
                    try:
                        # Try direct extraction even if transcripts are marked as disabled
                        transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                        if transcript_data:
                            logger.info("Successfully retrieved transcript through fallback method")
                            return {
                                'success': True,
                                'transcript': transcript_data,
                                'language': lang,
                                'type': 'fallback'
                            }
                    except Exception as fallback_error:
                        logger.warning(f"Fallback method also failed: {str(fallback_error)}")
                        continue

                except Exception as list_error:
                    logger.warning(f"Failed to list transcripts: {str(list_error)}")
                    # If listing fails, try direct extraction
                    try:
                        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                        logger.info(f"Successfully got transcript in {lang} via direct extraction")

                        return {
                            'success': True,
                            'transcript': transcript,
                            'language': lang,
                            'type': 'direct'
                        }
                    except Exception as direct_error:
                        logger.warning(f"Direct extraction also failed: {str(direct_error)}")
                        continue

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
        logger.info(f"Using browser emulation with random user agent: {get_random_user_agent()}")

        # First try direct extraction with our browser emulation approach
        languages = ['en', 'en-US', 'en-GB', 'a.en']
        
        # Add headers to all requests to avoid anti-scraping measures
        # The youtube_transcript_api uses requests internally
        # Let's make sure each request has appropriate browser-like headers
        original_get = requests.get
        
        def patched_get(*args, **kwargs):
            if 'headers' not in kwargs:
                kwargs['headers'] = {
                    'User-Agent': get_random_user_agent(),
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Referer': 'https://www.youtube.com/',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                }
            if args and isinstance(args[0], str) and 'youtube.com' in args[0]:
                logger.info(f"Patched request to: {args[0]}")
                logger.info(f"Using headers: {kwargs['headers']}")
            return original_get(*args, **kwargs)
        
        # Apply the monkey patch temporarily
        requests.get = patched_get
        
        try:
            # Proceed with transcript extraction using patched requests
            result = try_get_transcript(video_id, languages)
            
            if result['success']:
                logger.info("Successfully extracted transcript with browser emulation")
                # Get metadata
                try:
                    metadata = fetch_video_metadata(video_id)
                    if metadata:
                        result['metadata'] = metadata
                except Exception as metadata_err:
                    logger.warning(f"Couldn't fetch metadata: {str(metadata_err)}")
                
                return result
            
            # If direct extraction fails, try listing available transcripts
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
                                response = {
                                    'success': True,
                                    'transcript': transcript_data,
                                    'language': lang if method != 'translated' else 'en-translated',
                                    'type': method
                                }
                                
                                # Get metadata
                                try:
                                    metadata = fetch_video_metadata(video_id)
                                    if metadata:
                                        response['metadata'] = metadata
                                except Exception as metadata_err:
                                    logger.warning(f"Couldn't fetch metadata: {str(metadata_err)}")
                                    
                                return response
                        except Exception as e:
                            logger.error(f"Failed to get {method} transcript in {lang}: {str(e)}")
                            continue
                            
        finally:
            # Restore the original requests.get
            requests.get = original_get
            
        # If all attempts fail, check for specific error types
        for error in result.get('errors', []):
            if 'TranscriptsDisabled' in error.get('error', ''):
                return {
                    'success': False,
                    'error': "Transcripts are disabled for this video",
                    'errorType': "TranscriptsDisabled"
                }
            elif 'NoTranscriptFound' in error.get('error', ''):
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
        logger.error(f"Transcript extraction error: {str(e)}")
        error_type = "UnknownError"
        
        if isinstance(e, TranscriptsDisabled):
            error_type = "TranscriptsDisabled"
            error_msg = "Transcripts are disabled for this video"
        elif isinstance(e, NoTranscriptFound):
            error_type = "NoTranscriptFound"
            error_msg = "No transcripts found for this video"
        elif isinstance(e, requests.exceptions.RequestException):
            error_type = "NetworkError"
            error_msg = f"Network error: {str(e)}"
        elif isinstance(e, ValueError) and "URL" in str(e):
            error_type = "InvalidURL"
            error_msg = str(e)
        else:
            error_msg = str(e)
            
        return {
            'success': False,
            'error': error_msg,
            'errorType': error_type,
            'details': str(e)
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
    """Main function with enhanced environment verification."""
    temp_files = []
    try:
        # Log the environment/request information
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Environment: {os.environ.get('NODE_ENV', 'Not set')}")
        
        # Generate a unique session ID to track this request
        session_id = f"session_{time.time()}"
        logger.info(f"Session ID: {session_id}")
        
        # Verify environment first
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
        
        # Log network information
        try:
            import socket
            hostname = socket.gethostname()
            ip_addr = socket.gethostbyname(hostname)
            logger.info(f"Host: {hostname}, IP: {ip_addr}")
        except Exception as e:
            logger.warning(f"Could not determine host info: {str(e)}")

        try:
            video_id = extract_video_id(youtube_url)
            logger.info(f"Using user agent: {get_random_user_agent()}")
            result = extract_transcript(video_id)
            metadata = fetch_video_metadata(video_id)

            if result['success']:
                logger.info(f"Successfully extracted transcript for video {video_id} ({result.get('type', 'unknown')}) in {result.get('language', 'unknown')}")
                print(json.dumps({
                    "success": True,
                    "transcript": result['transcript'],
                    "language": result['language'],
                    "type": result['type'],
                    "metadata": metadata
                }))
                sys.exit(0)
            else:
                logger.error(f"Failed to extract transcript for video {video_id}: {result.get('error', 'Unknown error')}")
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
    main()