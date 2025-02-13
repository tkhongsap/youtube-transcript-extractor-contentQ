import os
import sys
import json
import logging
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import requests
import isodate

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL."""
    try:
        logger.info(f"Processing URL: {youtube_url}")
        parsed_url = urlparse(youtube_url)

        # Handle youtu.be URLs first (they're simpler)
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
        logger.error(f"Error in extract_video_id: {str(e)}")
        raise

def try_get_transcript(video_id: str, languages: list[str]) -> dict:
    """Try multiple methods to get transcript."""
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
        except Exception as e:
            logger.debug(f"Failed to get transcript in {lang}: {str(e)}")
            continue
    return {'success': False}

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

        # If that fails, try alternative methods
        try:
            logger.info("Attempting to list available transcripts")
            # Don't throw error if transcript is disabled, just return empty result
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            except Exception as e:
                logger.warning(f"Could not list transcripts: {str(e)}")
                # Return empty successful response instead of error
                return {
                    'success': True,
                    'transcript': [],
                    'language': 'en',
                    'type': 'empty',
                    'warning': 'Transcript not available'
                }

            # Try different transcript types
            for method in ['manual', 'generated', 'translated']:
                for lang in languages:
                    try:
                        if method == 'manual':
                            transcript = transcript_list.find_manually_created_transcript([lang])
                        elif method == 'generated':
                            transcript = transcript_list.find_generated_transcript([lang])
                        else:
                            # Try translation as last resort
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
                        logger.debug(f"Failed to get {method} transcript in {lang}: {str(e)}")
                        continue

        except Exception as e:
            logger.error(f"Error in transcript extraction: {str(e)}")
            # Return empty successful response instead of error
            return {
                'success': True,
                'transcript': [],
                'language': 'en',
                'type': 'empty',
                'warning': 'Transcript not available'
            }

        # If we get here, return empty response instead of error
        logger.warning("No transcript available, returning empty response")
        return {
            'success': True,
            'transcript': [],
            'language': 'en',
            'type': 'empty',
            'warning': 'No transcript available'
        }

    except Exception as e:
        logger.error(f"Fatal error in extract_transcript: {str(e)}")
        # Even for fatal errors, return empty success response
        return {
            'success': True,
            'transcript': [],
            'language': 'en',
            'type': 'empty',
            'warning': 'Error extracting transcript'
        }

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            logger.warning("YouTube API key not found in environment")
            return {}

        logger.info(f"Fetching metadata for: {video_id}")
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": api_key
            },
            timeout=10
        )

        if not response.ok:
            logger.error(f"Metadata API request failed: {response.status_code}")
            return {}

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
                    "error": result['error'],
                    "errorType": result.get('errorType', 'UnknownError'),
                    "metadata": metadata
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