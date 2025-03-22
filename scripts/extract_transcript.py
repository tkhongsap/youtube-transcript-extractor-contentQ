import os
import sys
import json
import logging
import tempfile
import time
import random
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from youtube_transcript_api.formatters import JSONFormatter
import requests
import isodate
import re
import platform
from importlib.metadata import version
from pytube import YouTube
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add diagnostic logging for environment variables
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)
logger.info("Environment variables diagnostic:")
logger.info(f"YOUTUBE_API_KEY exists: {bool(os.getenv('YOUTUBE_API_KEY'))}")
logger.info(f"NODE_ENV: {os.getenv('NODE_ENV', 'not set')}")
logger.info(f"Current working directory: {os.getcwd()}")

# Get version info safely
try:
    youtube_api_version = version('youtube-transcript-api')
except Exception:
    youtube_api_version = "unknown"

logger.info(f"Python version: {sys.version}")
logger.info(f"Platform: {platform.platform()}")
logger.info(f"youtube-transcript-api version: {youtube_api_version}")
logger.info(f"Environment: {os.getenv('NODE_ENV', 'development')}")
logger.info(f"Working directory: {os.getcwd()}")

def backoff_retry(func, max_retries=3, initial_delay=1):
    """Implements exponential backoff with shorter delays."""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            delay = (initial_delay * (2 ** attempt)) + random.uniform(0, 1)
            logger.warning(f"Attempt {attempt+1} failed. Retrying in {delay:.1f}s")
            time.sleep(delay)
    return None

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL."""
    try:
        logger.info(f"Processing URL: {youtube_url}")
        parsed_url = urlparse(youtube_url)

        if 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/').split('?')[0]
            if video_id:
                logger.info(f"Successfully extracted video ID from youtu.be URL: {video_id}")
                return video_id
            raise ValueError(f"Could not extract video ID from youtu.be URL: {youtube_url}")

        if 'youtube.com' in parsed_url.netloc:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                video_id = query_params['v'][0]
                logger.info(f"Successfully extracted video ID from youtube.com URL: {video_id}")
                return video_id
            elif '/v/' in parsed_url.path:
                video_id = parsed_url.path.split('/v/')[1].split('?')[0]
                logger.info(f"Successfully extracted video ID from /v/ path: {video_id}")
                return video_id
            raise ValueError(f"Could not extract video ID from URL: {youtube_url}")

        raise ValueError(f"Unsupported YouTube URL format: {youtube_url}")

    except Exception as e:
        logger.error(f"Error in extract_video_id: {str(e)}")
        raise

def check_video_status(video_id: str) -> dict:
    """Check video status with PyTube to get more information about availability."""
    try:
        logger.info(f"Checking video status for ID: {video_id}")
        yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')
        
        # Get basic video info
        status = {
            'available': True,
            'title': yt.title,
            'author': yt.author,
            'captions_available': bool(yt.captions),
            'caption_tracks': len(yt.captions) if yt.captions else 0
        }
        
        if yt.captions:
            status['caption_languages'] = list(yt.captions.keys())
            
        logger.info(f"Video status: {json.dumps(status)}")
        return status
    except Exception as e:
        logger.warning(f"Error checking video status: {str(e)}")
        return {
            'available': False,
            'error': str(e)
        }

def try_get_transcript_pytube(video_id: str) -> list:
    """Try to get transcript using pytube as a fallback."""
    try:
        logger.info("Attempting to get transcript using pytube")
        yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')
        captions = yt.captions

        if not captions:
            logger.warning("No captions found via pytube")
            return None

        # Try to get English captions first
        caption_track = None
        for lang_code in ['en', 'a.en']:
            if lang_code in captions:
                caption_track = captions[lang_code]
                break

        # If no English captions, take the first available
        if not caption_track and captions:
            caption_track = list(captions.values())[0]

        if caption_track:
            xml_captions = caption_track.xml_captions

            # Parse the XML captions
            segments = []
            current_text = ""
            start_time = 0

            for line in xml_captions.split('\n'):
                if '<text' in line:
                    start_match = re.search(r'start="([\d.]+)"', line)
                    if start_match:
                        start_time = float(start_match.group(1))
                if '</text>' in line:
                    text = re.sub(r'<[^>]+>', '', current_text).strip()
                    if text:
                        segments.append({
                            'text': text,
                            'start': start_time,
                            'duration': 0
                        })
                    current_text = ""
                else:
                    current_text += line

            if segments:
                logger.info("Successfully extracted transcript using pytube")
                return segments

        return None
    except Exception as e:
        logger.warning(f"Pytube transcript extraction failed: {str(e)}")
        return None

def try_get_transcript(video_id: str) -> dict:
    """Enhanced transcript extraction with better error handling."""

    def create_error_response(error_type: str, error_message: str) -> dict:
        return {
            'success': False,
            'error': error_message,
            'errorType': error_type
        }
    
    # Additional debugging
    logger.info(f"Starting transcript extraction for video ID: {video_id}")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"YouTube API key exists: {bool(os.getenv('YOUTUBE_API_KEY'))}")
    
    # Set up browser-like headers
    browser_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com'
    }
    
    # Apply browser emulation via monkey patching
    original_get = requests.get
    
    def patched_get(*args, **kwargs):
        if 'headers' not in kwargs:
            kwargs['headers'] = browser_headers
        else:
            kwargs['headers'].update(browser_headers)
        return original_get(*args, **kwargs)
    
    # Apply the patch
    requests.get = patched_get
    
    try:
        # Try direct API extraction first with browser emulation
        try:
            logger.info("Attempting transcript extraction via API with browser emulation")
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            if transcript:
                logger.info("Successfully retrieved transcript via API with browser emulation")
                return {
                    'success': True,
                    'transcript': transcript,
                    'type': 'api_emulated'
                }
        except Exception as e:
            error_msg = str(e).lower()
            logger.warning(f"API transcript extraction with browser emulation failed: {error_msg}")
            
            # Log exception type for better debugging
            logger.warning(f"Exception type: {type(e).__name__}")
            
            # Check for specific error conditions
            if "subtitles are disabled" in error_msg:
                if isinstance(e, TranscriptsDisabled):
                    logger.warning("Confirmed TranscriptsDisabled exception")
                    
                # Even with TranscriptsDisabled, try pytube as it uses a different approach
        
        # Try pytube as fallback
        try:
            logger.info("Attempting transcript extraction via pytube with browser emulation")
            yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')
            captions = yt.captions
    
            if not captions:
                logger.warning("No captions found via pytube")
            else:
                logger.info(f"PyTube found captions: {list(captions.keys())}")
                
                # Try to get English captions first
                caption_track = None
                for lang_code in ['en', 'a.en']:
                    if lang_code in captions:
                        caption_track = captions[lang_code]
                        break
    
                # If no English captions, take the first available
                if not caption_track and captions:
                    caption_track = list(captions.values())[0]
    
                if caption_track:
                    xml_captions = caption_track.xml_captions
                    segments = []
                    current_text = ""
                    start_time = 0
    
                    for line in xml_captions.split('\n'):
                        if '<text' in line:
                            start_match = re.search(r'start="([\d.]+)"', line)
                            if start_match:
                                start_time = float(start_match.group(1))
                        if '</text>' in line:
                            text = re.sub(r'<[^>]+>', '', current_text).strip()
                            if text:
                                segments.append({
                                    'text': text,
                                    'start': start_time,
                                    'duration': 0
                                })
                            current_text = ""
                        else:
                            current_text += line
    
                    if segments:
                        logger.info("Successfully extracted transcript using pytube with browser emulation")
                        return {
                            'success': True,
                            'transcript': segments,
                            'type': 'pytube_emulated'
                        }
        except Exception as e:
            logger.warning(f"Pytube transcript extraction with browser emulation failed: {str(e)}")
        
        # If all attempts fail, create error response
        logger.warning("All transcript extraction attempts failed")
        return create_error_response(
            "NoTranscriptFound",
            "No transcripts available for this video after trying multiple methods with browser emulation"
        )
    finally:
        # Restore original function
        requests.get = original_get

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata with retry mechanism."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            logger.warning("YouTube API key not found in environment")
            return {}

        logger.info(f"Fetching metadata for: {video_id}")
        def fetch_data():
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
            return response.json()

        data = backoff_retry(fetch_data)
        if not data or not data.get("items"):
            logger.error("No metadata items found in response")
            return {}

        video = data["items"][0]
        raw_duration = video["contentDetails"].get("duration", "")
        try:
            if raw_duration.startswith("PT"):
                duration = str(isodate.parse_duration(raw_duration)).split('.')[0]
            else:
                duration = raw_duration
                logger.warning(f"Unexpected duration format: {raw_duration}")
        except Exception as parse_error:
            logger.warning(f"Failed to parse duration '{raw_duration}': {str(parse_error)}")
            duration = raw_duration

        metadata = {
            "title": video["snippet"]["title"],
            "channelTitle": video["snippet"]["channelTitle"],
            "publishedAt": video["snippet"]["publishedAt"],
            "viewCount": video["statistics"]["viewCount"],
            "duration": duration
        }

        logger.info("Successfully retrieved metadata")
        return metadata

    except Exception as e:
        logger.error(f"Error in fetch_video_metadata: {str(e)}")
        return {}

def main():
    """Main function with enhanced error handling."""
    try:
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
            
            # Check video status first
            video_status = check_video_status(video_id)
            
            result = try_get_transcript(video_id)
            metadata = fetch_video_metadata(video_id)

            if result['success']:
                print(json.dumps({
                    "success": True,
                    "transcript": result['transcript'],
                    "type": result['type'],
                    "metadata": metadata,
                    "video_status": video_status
                }))
                sys.exit(0)
            else:
                print(json.dumps({
                    "success": False,
                    "error": result.get('error', 'Unknown error'),
                    "errorType": result.get('errorType', 'UnknownError'),
                    "metadata": metadata,
                    "video_status": video_status
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
            "error": "An unexpected error occurred",
            "errorType": "FatalError"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()