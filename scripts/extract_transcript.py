import os
import sys
import json
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript

def extract_video_id(youtube_url: str) -> str:
    """Extract the video ID from a given YouTube URL."""
    try:
        parsed_url = urlparse(youtube_url)
        if 'youtube.com' in parsed_url.netloc:
            query_params = parse_qs(parsed_url.query)
            video_ids = query_params.get('v')
            if video_ids and len(video_ids) > 0:
                return video_ids[0]
            else:
                raise ValueError("Missing video id in URL query parameters")
        elif 'youtu.be' in parsed_url.netloc:
            video_id = parsed_url.path.lstrip('/')
            if video_id:
                return video_id.split('/')[0]
            else:
                raise ValueError("Missing video id in short URL path")
        else:
            raise ValueError("Invalid YouTube URL")
    except Exception as e:
        raise ValueError(f"Error parsing URL: {e}")

def fetch_transcript(video_id: str) -> str:
    """Fetch the transcript for the given video ID."""
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = "\n".join([item.get("text", "") for item in transcript_list])
        return transcript_text
    except TranscriptsDisabled:
        raise Exception("Transcripts are disabled for this video.")
    except NoTranscriptFound:
        raise Exception("No transcript found for this video.")
    except CouldNotRetrieveTranscript as e:
        raise Exception(f"Could not retrieve transcript: {e}")
    except Exception as e:
        raise Exception(f"An error occurred while fetching transcript: {e}")

def main():
    try:
        if len(sys.argv) != 2:
            raise ValueError("Please provide a YouTube URL as an argument")
        
        youtube_url = sys.argv[1]
        video_id = extract_video_id(youtube_url)
        transcript = fetch_transcript(video_id)
        
        # Print the result as JSON to stdout
        result = {
            "success": True,
            "transcript": transcript,
            "video_id": video_id
        }
        print(json.dumps(result))
        sys.exit(0)
    except Exception as err:
        error_result = {
            "success": False,
            "error": str(err)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
