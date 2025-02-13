import os
import sys
import json
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import requests
import isodate

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL."""
    try:
        print(f"Processing URL: {youtube_url}", file=sys.stderr)
        parsed_url = urlparse(youtube_url)

        # Handle standard youtube.com URLs
        if 'youtube.com' in parsed_url.netloc:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                video_id = query_params['v'][0]
                print(f"Successfully extracted video ID from standard URL: {video_id}", file=sys.stderr)
                return video_id
            elif '/v/' in parsed_url.path:
                video_id = parsed_url.path.split('/v/')[1].split('?')[0]
                print(f"Successfully extracted video ID from /v/ path: {video_id}", file=sys.stderr)
                return video_id
            raise ValueError(f"Could not extract video ID from URL: {youtube_url}")

        # Handle youtu.be URLs
        elif 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/')
            if video_id:
                video_id = video_id.split('?')[0]
                print(f"Successfully extracted video ID from youtu.be URL: {video_id}", file=sys.stderr)
                return video_id
            raise ValueError(f"Could not extract video ID from youtu.be URL: {youtube_url}")

        raise ValueError(f"Unsupported YouTube URL format: {youtube_url}")

    except Exception as e:
        print(f"Error in extract_video_id: {str(e)}", file=sys.stderr)
        raise

def fetch_transcript(video_id: str) -> str:
    """Fetch the transcript with enhanced error handling and logging."""
    print(f"Starting transcript fetch for video ID: {video_id}", file=sys.stderr)

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        print("Successfully retrieved transcript list", file=sys.stderr)

        # Try to get English transcript (manual or auto-generated)
        try:
            transcript = transcript_list.find_transcript(['en'])
            print("Found English transcript", file=sys.stderr)
        except:
            try:
                transcript = transcript_list.find_transcript(['en-US'])
                print("Found en-US transcript", file=sys.stderr)
            except:
                # Get any available transcript and translate to English
                available_transcripts = transcript_list.find_manually_created_transcript()
                if not available_transcripts:
                    available_transcripts = transcript_list.find_generated_transcript()
                transcript = available_transcripts.translate('en')
                print("Using translated transcript", file=sys.stderr)

        transcript_data = transcript.fetch()
        print("Successfully fetched transcript data", file=sys.stderr)

        if not transcript_data:
            raise NoTranscriptFound("Empty transcript data received")

        transcript_text = "\n".join([item.get("text", "") for item in transcript_data])
        if not transcript_text.strip():
            raise NoTranscriptFound("Empty transcript text after processing")

        print("Successfully processed transcript text", file=sys.stderr)
        return transcript_text

    except TranscriptsDisabled:
        print("TranscriptsDisabled error occurred", file=sys.stderr)
        raise TranscriptsDisabled(
            "This video has disabled transcripts. Please try another video with captions enabled."
        )
    except NoTranscriptFound:
        print("NoTranscriptFound error occurred", file=sys.stderr)
        raise NoTranscriptFound(
            "No transcript available for this video. Please try a video with captions."
        )
    except Exception as e:
        print(f"Unexpected error in fetch_transcript: {str(e)}", file=sys.stderr)
        raise Exception(f"Failed to fetch transcript: {str(e)}")

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata with enhanced error handling."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            print("Warning: YouTube API key not found in environment", file=sys.stderr)
            return {}

        print(f"Fetching metadata for video ID: {video_id}", file=sys.stderr)
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
            print(f"Metadata API request failed: {response.status_code}", file=sys.stderr)
            return {}

        data = response.json()
        if not data.get("items"):
            print("No metadata items found in response", file=sys.stderr)
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

        print("Successfully retrieved metadata", file=sys.stderr)
        return metadata

    except Exception as e:
        print(f"Error in fetch_video_metadata: {str(e)}", file=sys.stderr)
        return {}

def main():
    """Main function with enhanced error handling and logging."""
    try:
        if len(sys.argv) != 2:
            print("Error: Missing YouTube URL argument", file=sys.stderr)
            print(json.dumps({
                "success": False,
                "error": "Missing YouTube URL",
                "errorType": "InvalidInput"
            }))
            sys.exit(1)

        youtube_url = sys.argv[1]
        print(f"Starting transcript extraction for URL: {youtube_url}", file=sys.stderr)

        try:
            video_id = extract_video_id(youtube_url)
            transcript = fetch_transcript(video_id)
            metadata = fetch_video_metadata(video_id)

            print("Process completed successfully", file=sys.stderr)
            print(json.dumps({
                "success": True,
                "transcript": transcript,
                "metadata": metadata
            }))
            sys.exit(0)

        except ValueError as e:
            print(json.dumps({
                "success": False,
                "error": str(e),
                "errorType": "InvalidURL"
            }))
            sys.exit(1)
        except TranscriptsDisabled:
            metadata = fetch_video_metadata(video_id)
            print(json.dumps({
                "success": False,
                "error": "This video has disabled transcripts. Please try another video with captions enabled.",
                "errorType": "TranscriptsDisabled",
                "metadata": metadata
            }))
            sys.exit(1)
        except NoTranscriptFound:
            metadata = fetch_video_metadata(video_id)
            print(json.dumps({
                "success": False,
                "error": "No transcript found for this video. Please try a video with captions.",
                "errorType": "NoTranscriptFound",
                "metadata": metadata
            }))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({
                "success": False,
                "error": str(e),
                "errorType": "UnknownError"
            }))
            sys.exit(1)

    except Exception as e:
        print(f"Fatal error in main: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "success": False,
            "error": "An unexpected error occurred",
            "errorType": "FatalError"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()