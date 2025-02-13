import os
import sys
import json
import logging
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import requests
import isodate

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL."""
    try:
        logger.info(f"Processing URL: {youtube_url}")
        parsed_url = urlparse(youtube_url)

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

        # Handle youtu.be URLs
        elif 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/')
            if video_id:
                video_id = video_id.split('?')[0]
                logger.info(f"Successfully extracted video ID from youtu.be URL: {video_id}")
                return video_id
            raise ValueError(f"Could not extract video ID from youtu.be URL: {youtube_url}")

        raise ValueError(f"Unsupported YouTube URL format: {youtube_url}")

    except Exception as e:
        logger.error(f"Error in extract_video_id: {str(e)}")
        raise

def extract_transcript(video_id: str) -> dict:
    """Extract transcript with enhanced error handling and fallback mechanisms."""
    try:
        logger.info(f"Attempting to fetch transcript for video ID: {video_id}")

        # Define supported languages in order of preference
        languages = ['en', 'en-US', 'en-GB', 'a.en']
        transcript_list = None

        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            logger.info("Successfully retrieved transcript list")
        except Exception as e:
            logger.error(f"Error retrieving transcript list: {str(e)}")
            return {
                'success': False,
                'error': 'Failed to retrieve transcript list',
                'errorType': 'TranscriptListError'
            }

        # Try manual transcripts first
        for lang in languages:
            try:
                logger.info(f"Attempting to find manual transcript in {lang}")
                transcript = transcript_list.find_manually_created_transcript([lang])
                transcript_data = transcript.fetch()
                logger.info(f"Found manual transcript in {lang}")
                return {
                    'success': True,
                    'transcript': transcript_data,
                    'language': lang,
                    'type': 'manual'
                }
            except Exception as e:
                logger.debug(f"No manual transcript in {lang}: {str(e)}")
                continue

        # Try auto-generated transcripts
        for lang in languages:
            try:
                logger.info(f"Attempting to find auto-generated transcript in {lang}")
                transcript = transcript_list.find_generated_transcript([lang])
                transcript_data = transcript.fetch()
                logger.info(f"Found auto-generated transcript in {lang}")
                return {
                    'success': True,
                    'transcript': transcript_data,
                    'language': lang,
                    'type': 'auto'
                }
            except Exception as e:
                logger.debug(f"No auto-generated transcript in {lang}: {str(e)}")
                continue

        # Try translation as last resort
        try:
            logger.info("Attempting to translate transcript from any available language")
            # Get first available transcript
            available_transcripts = transcript_list.manual_transcripts
            if not available_transcripts:
                available_transcripts = transcript_list.generated_transcripts

            if available_transcripts:
                first_transcript = next(iter(available_transcripts.values()))
                translated = first_transcript.translate('en')
                transcript_data = translated.fetch()
                logger.info("Successfully translated transcript to English")
                return {
                    'success': True,
                    'transcript': transcript_data,
                    'language': 'en-translated',
                    'type': 'translated'
                }
        except Exception as e:
            logger.error(f"Translation attempt failed: {str(e)}")

        logger.error("No transcript available in any supported language")
        return {
            'success': False,
            'error': 'No transcript available in any supported language',
            'errorType': 'NoTranscriptAvailable'
        }

    except Exception as e:
        logger.error(f"Extraction failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'errorType': 'UnknownError'
        }

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata with enhanced error handling."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            logger.warning("YouTube API key not found in environment")
            return {}

        logger.info(f"Fetching metadata for video ID: {video_id}")
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
    """Main function with enhanced error handling and logging."""
    try:
        if len(sys.argv) != 2:
            logger.error("Error: Missing YouTube URL argument")
            print(json.dumps({
                "success": False,
                "error": "Missing YouTube URL",
                "errorType": "InvalidInput"
            }))
            sys.exit(1)

        youtube_url = sys.argv[1]
        logger.info(f"Starting transcript extraction for URL: {youtube_url}")

        try:
            video_id = extract_video_id(youtube_url)
            result = extract_transcript(video_id)
            metadata = fetch_video_metadata(video_id)

            if result['success']:
                logger.info("Process completed successfully")
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