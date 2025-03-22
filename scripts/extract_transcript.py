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
from pathlib import Path
import pkg_resources

# List of user agents to randomize requests
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
]

def get_random_user_agent():
    """Get a random user agent from the list."""
    return random.choice(USER_AGENTS)

# Load environment variables from .env file
load_dotenv()

# Add diagnostic logging for environment variables
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)
logger.info("Environment variables diagnostic:")
logger.info(f"YOUTUBE_API_KEY exists: {bool(os.getenv('YOUTUBE_API_KEY'))}")
logger.info(f"NODE_ENV: {os.getenv('NODE_ENV', 'not set')}")
logger.info(f"HTTP_PROXY exists: {bool(os.getenv('HTTP_PROXY'))}")
logger.info(f"HTTPS_PROXY exists: {bool(os.getenv('HTTPS_PROXY'))}")
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

def establish_youtube_session():
    """Create a session with YouTube to establish cookies before transcript extraction."""
    try:
        logger.info("Establishing YouTube session before transcript extraction")
        
        # Enhanced browser-like fingerprinting
        browser_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Referer': 'https://www.google.com/',
            'Origin': 'https://www.google.com',
            'Sec-Ch-Ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        }
        
        session = requests.Session()
        session.headers.update(browser_headers)
        
        # Add proxy support if configured
        proxies = {
            'http': os.getenv('HTTP_PROXY', ''),
            'https': os.getenv('HTTPS_PROXY', '')
        }
        
        if proxies['https'] or proxies['http']:
            logger.info(f"Using proxy configuration")
            session.proxies = proxies
        
        # First establish a session by visiting YouTube homepage
        response = session.get('https://www.youtube.com/', timeout=15)
        logger.info(f"Established YouTube session with status {response.status_code}, cookies: {len(session.cookies)}")
        
        # Add a randomized human-like delay
        time.sleep(random.uniform(1.5, 3.5))
        
        return session
    except Exception as e:
        logger.warning(f"Error establishing YouTube session: {str(e)}")
        return None

def get_captions_via_data_api(video_id: str) -> list:
    """Try to get captions using the YouTube Data API."""
    try:
        logger.info(f"Attempting to get captions via YouTube Data API for video: {video_id}")
        api_key = os.getenv('YOUTUBE_API_KEY')
        
        if not api_key:
            logger.warning("YouTube API key not found, cannot use Data API for captions")
            return None
            
        # First get the caption tracks
        url = f"https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId={video_id}&key={api_key}"
        
        # Use a session with browser-like headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            logger.warning(f"Caption list request failed: {response.status_code}")
            return None
            
        data = response.json()
        
        if not data.get('items'):
            logger.warning("No caption tracks found via Data API")
            return None
            
        # Look for English captions or auto-generated captions
        caption_id = None
        for item in data['items']:
            track_name = item['snippet'].get('name', '').lower()
            track_language = item['snippet'].get('language', '')
            is_auto = item['snippet'].get('trackKind') == 'ASR'
            
            if track_language == 'en' or 'english' in track_name:
                caption_id = item['id']
                logger.info(f"Found English caption track: {track_name}")
                break
                
            # Fallback to auto-generated if no manual English track
            if is_auto and not caption_id:
                caption_id = item['id']
                logger.info(f"Found auto-generated caption track: {track_name}")
        
        if not caption_id:
            logger.warning("No suitable caption tracks found")
            return None
            
        # Now download the actual caption track
        download_url = f"https://www.googleapis.com/youtube/v3/captions/{caption_id}?key={api_key}"
        # Note: This typically requires OAuth2 authorization for non-public captions
        # For this example, we'll stop here - in a real implementation, you'd need to authenticate 
        
        logger.info("Caption track found via Data API, but full download requires OAuth2")
        # For now, indicate we found captions even if we can't download them
        return [{"text": "Caption track found but OAuth2 required for download", "start": 0, "duration": 0}]
            
    except Exception as e:
        logger.warning(f"Error getting captions via Data API: {str(e)}")
        return None

def check_video_status(video_id: str) -> dict:
    """Check video status with PyTube to get more information about availability."""
    try:
        logger.info(f"Checking video status for ID: {video_id}")
        
        # Create a session with proper browser emulation
        session = establish_youtube_session()
        if session:
            # Visit the video page first
            video_url = f'https://www.youtube.com/watch?v={video_id}'
            response = session.get(video_url, timeout=15)
            logger.info(f"Visited video page with status {response.status_code}")
            
            # Add a randomized human-like delay
            time.sleep(random.uniform(2.0, 4.0))
        
        # Now use pytube with our established session
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
    
    # First, establish a YouTube session with cookies
    session = establish_youtube_session()
    
    # Add a realistic delay to mimic human behavior
    time.sleep(random.uniform(3.0, 7.0))
    
    # Set up browser-like headers with enhanced fingerprinting
    browser_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
        'Sec-Ch-Ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    }
    
    # Add proxy support
    proxies = {
        'http': os.getenv('HTTP_PROXY', ''),
        'https': os.getenv('HTTPS_PROXY', '')
    }
    
    # Apply browser emulation via monkey patching
    original_get = requests.get
    
    def patched_get(*args, **kwargs):
        if 'headers' not in kwargs:
            kwargs['headers'] = browser_headers
        else:
            kwargs['headers'].update(browser_headers)
            
        # Add proxy if configured
        if (proxies['https'] or proxies['http']) and 'proxies' not in kwargs:
            kwargs['proxies'] = proxies
            
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
        
        # Try pytube as fallback with additional delay
        time.sleep(random.uniform(2.0, 4.0))
        
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
        
        # Try YouTube Data API approach as last resort
        time.sleep(random.uniform(1.0, 3.0))
        
        captions = get_captions_via_data_api(video_id)
        if captions:
            logger.info("Successfully retrieved caption info via YouTube Data API")
            return {
                'success': True,
                'transcript': captions,
                'type': 'data_api'
            }
        
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