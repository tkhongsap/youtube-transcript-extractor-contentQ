import os
import sys
import json
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript
import requests
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
            # Handle youtube.com/v/VIDEO_ID format
            elif parsed_url.path.startswith('/v/'):
                video_id = parsed_url.path.split('/v/')[1]
                print(f"Extracted video ID from /v/ path: {video_id}", file=sys.stderr)
                return video_id.split('?')[0]  # Remove any query parameters
            raise ValueError("Invalid YouTube URL format")

        # Handle youtu.be URLs
        elif 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/')
            if video_id:
                print(f"Extracted video ID: {video_id}", file=sys.stderr)
                return video_id.split('?')[0]  # Remove any query parameters
            raise ValueError("Invalid YouTube URL format")
        else:
            raise ValueError("Invalid YouTube URL")
    except Exception as e:
        print(f"Error extracting video ID: {str(e)}", file=sys.stderr)
        raise ValueError("Invalid YouTube URL format")

def fetch_transcript(video_id: str) -> str:
    """Fetch the transcript for the given video ID with retries and fallbacks."""
    print(f"Fetching transcript for video ID: {video_id}", file=sys.stderr)

    # Try different transcript types in order of preference
    transcript_types = [
        ('manual', ['en']),
        ('manual', ['en-US']),
        ('generated', ['en']),
        ('generated', ['en-US']),
        ('translate', ['en'])  # Fallback to translated version
    ]

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        for trans_type, langs in transcript_types:
            try:
                if trans_type == 'manual':
                    transcript = transcript_list.find_manually_created_transcript(langs)
                elif trans_type == 'generated':
                    transcript = transcript_list.find_generated_transcript(langs)
                else:  # translate
                    available_transcripts = transcript_list.find_generated_transcript(['en', 'en-US', 'auto'])
                    if available_transcripts:
                        transcript = available_transcripts.translate('en')
                    else:
                        continue

                transcript_data = transcript.fetch()
                if transcript_data:
                    transcript_text = "\n".join([item.get("text", "") for item in transcript_data])
                    if transcript_text.strip():
                        return transcript_text
            except Exception as e:
                print(f"Failed to fetch {trans_type} transcript: {str(e)}", file=sys.stderr)
                continue

        raise NoTranscriptFound(f"No suitable transcript found for video {video_id}")

    except TranscriptsDisabled:
        print("Transcripts are disabled", file=sys.stderr)
        raise TranscriptsDisabled(
            "This video has disabled transcripts. Please try another video with captions enabled."
        )
    except NoTranscriptFound:
        print("No transcript available", file=sys.stderr)
        raise NoTranscriptFound(
            "No transcript available for this video. Please try a video with captions."
        )
    except Exception as e:
        print(f"Transcript fetch error: {str(e)}", file=sys.stderr)
        raise Exception(f"Failed to fetch transcript: {str(e)}")

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata using YouTube API with error handling."""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            print("Missing YouTube API key", file=sys.stderr)
            return {}

        print(f"Fetching metadata for: {video_id}", file=sys.stderr)
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": api_key
            },
            timeout=10  # Add timeout
        )

        if not response.ok:
            print(f"Metadata fetch failed: {response.status_code}", file=sys.stderr)
            return {}

        data = response.json()
        if not data.get("items"):
            print("No metadata found", file=sys.stderr)
            return {}

        video = data["items"][0]
        duration = isodate.parse_duration(video["contentDetails"]["duration"])
        duration_str = str(duration).split('.')[0]  # Remove microseconds

        return {
            "title": video["snippet"]["title"],
            "channelTitle": video["snippet"]["channelTitle"],
            "publishedAt": video["snippet"]["publishedAt"],
            "viewCount": video["statistics"]["viewCount"],
            "duration": duration_str
        }
    except Exception as e:
        print(f"Metadata error: {str(e)}", file=sys.stderr)
        return {}

def main():
    """Main function to handle transcript extraction with improved error handling."""
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
            video_id = extract_video_id(youtube_url)
            print(f"Successfully extracted video ID: {video_id}", file=sys.stderr)

            transcript = fetch_transcript(video_id)
            print("Successfully fetched transcript", file=sys.stderr)

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
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "success": False,
            "error": "An unexpected error occurred",
            "errorType": "FatalError"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()