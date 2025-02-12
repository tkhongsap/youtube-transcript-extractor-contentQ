import os
import sys
import json
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript
import requests
from datetime import datetime
import isodate

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL."""
    try:
        print(f"Processing URL: {youtube_url}", file=sys.stderr)
        parsed_url = urlparse(youtube_url)

        # Handle youtube.com URLs
        if 'youtube.com' in parsed_url.netloc:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                video_id = query_params['v'][0]
                print(f"Extracted video ID: {video_id}", file=sys.stderr)
                return video_id
            raise ValueError("Invalid YouTube URL format")

        # Handle youtu.be URLs
        elif 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/')
            if video_id:
                print(f"Extracted video ID: {video_id}", file=sys.stderr)
                return video_id
            raise ValueError("Invalid YouTube URL format")
        else:
            raise ValueError("Invalid YouTube URL")
    except Exception as e:
        print(f"Error extracting video ID: {str(e)}", file=sys.stderr)
        raise ValueError("Invalid YouTube URL format")

def fetch_transcript(video_id: str) -> str:
    """Fetch the transcript for the given video ID."""
    try:
        print(f"Fetching transcript for video ID: {video_id}", file=sys.stderr)

        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            print("Retrieved transcript list", file=sys.stderr)

            try:
                # Try manual transcript first
                print("Attempting manual transcript", file=sys.stderr)
                transcript = transcript_list.find_manually_created_transcript(['en'])
            except Exception as e:
                print(f"Manual transcript failed: {str(e)}", file=sys.stderr)
                print("Falling back to auto-generated transcript", file=sys.stderr)
                # Fall back to auto-generated
                transcript = transcript_list.find_generated_transcript(['en'])

            print("Fetching transcript data", file=sys.stderr)
            transcript_data = transcript.fetch()

            if not transcript_data:
                print("No transcript data found", file=sys.stderr)
                raise NoTranscriptFound(video_id)

            print("Processing transcript text", file=sys.stderr)
            transcript_text = "\n".join([item.get("text", "") for item in transcript_data])

            if not transcript_text.strip():
                print("Empty transcript text", file=sys.stderr)
                raise NoTranscriptFound(video_id)

            print("Successfully retrieved transcript", file=sys.stderr)
            return transcript_text

        except TranscriptsDisabled:
            print("Transcripts are disabled", file=sys.stderr)
            raise TranscriptsDisabled("Transcripts are disabled for this video")
        except NoTranscriptFound:
            print("No transcript available", file=sys.stderr)
            raise NoTranscriptFound("No transcript available for this video")
        except Exception as e:
            print(f"Transcript fetch failed: {str(e)}", file=sys.stderr)
            raise Exception(f"Failed to fetch transcript: {str(e)}")

    except Exception as e:
        print(f"Transcript process failed: {str(e)}", file=sys.stderr)
        raise

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata using YouTube API."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            print("Missing YouTube API key", file=sys.stderr)
            return {}  # Return empty metadata rather than failing

        print(f"Fetching metadata for: {video_id}", file=sys.stderr)
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": api_key
            }
        )

        if not response.ok:
            print(f"Metadata fetch failed: {response.status_code}", file=sys.stderr)
            return {}  # Return empty metadata on API failure

        data = response.json()
        if not data.get("items"):
            print("No metadata found", file=sys.stderr)
            return {}

        video = data["items"][0]
        print("Successfully fetched metadata", file=sys.stderr)

        return {
            "title": video["snippet"]["title"],
            "channelTitle": video["snippet"]["channelTitle"],
            "publishedAt": video["snippet"]["publishedAt"],
            "viewCount": video["statistics"]["viewCount"],
            "duration": video["contentDetails"]["duration"]
        }
    except Exception as e:
        print(f"Metadata error: {str(e)}", file=sys.stderr)
        return {}  # Return empty metadata on any error

def main():
    """Main function to handle transcript extraction."""
    try:
        if len(sys.argv) != 2:
            print("Missing URL argument", file=sys.stderr)
            print(json.dumps({
                "success": False,
                "error": "Missing YouTube URL",
                "errorType": "InvalidInput"
            }))
            sys.exit(1)

        youtube_url = sys.argv[1]
        print(f"Starting process for URL: {youtube_url}", file=sys.stderr)

        try:
            # Extract video ID first
            video_id = extract_video_id(youtube_url)
            print(f"Successfully extracted video ID: {video_id}", file=sys.stderr)

            # Get transcript
            transcript = fetch_transcript(video_id)
            print("Successfully fetched transcript", file=sys.stderr)

            # Only fetch metadata if transcript succeeds
            metadata = fetch_video_metadata(video_id)
            print("Process completed successfully", file=sys.stderr)

            # Return success response
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
            print(json.dumps({
                "success": False,
                "error": "This video has disabled transcripts",
                "errorType": "TranscriptsDisabled"
            }))
            sys.exit(1)
        except NoTranscriptFound:
            print(json.dumps({
                "success": False,
                "error": "No transcript found for this video",
                "errorType": "NoTranscriptFound"
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
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "success": False,
            "error": "An unexpected error occurred",
            "errorType": "FatalError"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()