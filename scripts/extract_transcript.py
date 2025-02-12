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
        print(f"Extracting video ID from URL: {youtube_url}", file=sys.stderr)
        parsed_url = urlparse(youtube_url)

        # Handle youtube.com URLs
        if 'youtube.com' in parsed_url.netloc:
            # Handle live stream URLs
            if '/live/' in parsed_url.path:
                video_id = parsed_url.path.split('/live/')[1].split('?')[0]
                if video_id:
                    return video_id
                raise ValueError("Missing video id in live stream URL")

            # Handle regular watch URLs
            query_params = parse_qs(parsed_url.query)
            video_ids = query_params.get('v')
            if video_ids and len(video_ids) > 0:
                return video_ids[0]
            else:
                raise ValueError("Missing video id in URL query parameters")

        # Handle youtu.be URLs
        elif 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/')
            if video_id:
                return video_id.split('/')[0]
            else:
                raise ValueError("Missing video id in short URL path")
        else:
            raise ValueError("Invalid YouTube URL")
    except Exception as e:
        print(f"Error parsing URL: {str(e)}", file=sys.stderr)
        raise ValueError(f"Error parsing URL: {e}")

def format_duration(duration_str: str) -> str:
    """Format duration string to human readable format."""
    try:
        # Remove PT from start
        duration = duration_str.replace('PT', '')
        hours = 0
        minutes = 0
        seconds = 0

        # Parse hours if present
        if 'H' in duration:
            hours_str = duration.split('H')[0]
            hours = int(hours_str)
            duration = duration.split('H')[1]

        # Parse minutes if present
        if 'M' in duration:
            minutes_str = duration.split('M')[0]
            if 'H' in minutes_str:  # If we already handled hours
                minutes_str = minutes_str.split('H')[1]
            minutes = int(minutes_str)
            duration = duration.split('M')[1]

        # Parse seconds if present
        if 'S' in duration:
            seconds_str = duration.replace('S', '')
            seconds = int(seconds_str)

        # Format the duration string
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes}:{seconds:02d}"
    except Exception as e:
        print(f"Error parsing duration: {str(e)}", file=sys.stderr)
        return "00:00"  # Return default duration on error

def fetch_video_metadata(video_id: str) -> dict:
    """Fetch video metadata using YouTube Data API."""
    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        raise ValueError("YouTube API key not found in environment variables")

    print(f"Fetching metadata for video ID: {video_id}", file=sys.stderr)
    url = f"https://www.googleapis.com/youtube/v3/videos"
    params = {
        "part": "snippet,statistics,contentDetails",
        "id": video_id,
        "key": api_key
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        if not data.get("items"):
            raise ValueError("Video not found")

        video = data["items"][0]
        duration_str = video["contentDetails"]["duration"]

        return {
            "title": video["snippet"]["title"],
            "channelTitle": video["snippet"]["channelTitle"],
            "publishedAt": video["snippet"]["publishedAt"],
            "viewCount": video["statistics"]["viewCount"],
            "duration": format_duration(duration_str)
        }
    except Exception as e:
        print(f"Error fetching metadata: {str(e)}", file=sys.stderr)
        raise Exception(f"Failed to fetch video metadata: {str(e)}")

def fetch_transcript(video_id: str) -> str:
    """Fetch the transcript for the given video ID."""
    try:
        print(f"Fetching transcript for video ID: {video_id}", file=sys.stderr)
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            # Try to get the manually created transcripts first
            try:
                transcript = transcript_list.find_manually_created_transcript()
            except:
                # Fall back to any available transcript
                transcript = transcript_list.find_generated_transcript(['en'])

            if not transcript:
                raise NoTranscriptFound()

            transcript_data = transcript.fetch()
            if not transcript_data:
                raise NoTranscriptFound()

            transcript_text = "\n".join([item.get("text", "") for item in transcript_data])
            if not transcript_text.strip():
                raise NoTranscriptFound()

            return transcript_text
        except TranscriptsDisabled:
            print("Transcripts are disabled for this video", file=sys.stderr)
            raise TranscriptsDisabled("This video has disabled transcripts. Please try another video that has captions enabled.")
        except NoTranscriptFound:
            print("No transcript found for this video", file=sys.stderr)
            raise NoTranscriptFound("No captions found for this video. Please try a video with captions.")
        except Exception as e:
            print(f"Error fetching transcript: {str(e)}", file=sys.stderr)
            raise Exception(f"An error occurred while fetching transcript: {str(e)}")
    except Exception as e:
        print(f"Transcript fetch failed: {str(e)}", file=sys.stderr)
        raise

def main():
    try:
        if len(sys.argv) != 2:
            raise ValueError("Please provide a YouTube URL as an argument")

        youtube_url = sys.argv[1]
        print(f"Processing URL: {youtube_url}", file=sys.stderr)

        video_id = extract_video_id(youtube_url)
        print(f"Extracted video ID: {video_id}", file=sys.stderr)

        try:
            # Fetch transcript first to check if it's available
            transcript = fetch_transcript(video_id)

            # Only fetch metadata if transcript is available
            metadata = fetch_video_metadata(video_id)

            # Print the result as JSON to stdout
            result = {
                "success": True,
                "transcript": transcript,
                "metadata": metadata,
                "video_id": video_id
            }
            print(json.dumps(result))
            sys.exit(0)
        except TranscriptsDisabled as e:
            error_result = {
                "success": False,
                "error": str(e),
                "errorType": "TranscriptsDisabled"
            }
            print(json.dumps(error_result))
            sys.exit(1)
        except NoTranscriptFound as e:
            error_result = {
                "success": False,
                "error": str(e),
                "errorType": "NoTranscriptFound"
            }
            print(json.dumps(error_result))
            sys.exit(1)
    except Exception as err:
        print(f"Error in main: {str(err)}", file=sys.stderr)
        error_result = {
            "success": False,
            "error": str(err),
            "errorType": "GeneralError"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()