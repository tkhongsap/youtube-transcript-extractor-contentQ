"""
Test script for transcript extraction
This script helps debug issues with transcript extraction in different environments
"""
import os
import sys
import json
import logging
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def main():
    """Test transcript extraction with a specific video ID"""
    # Test with the same video ID that works in dev but fails in production
    video_id = "yr0GiSgUvPU"
    
    logger.info(f"Environment diagnostic:")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")
    logger.info(f"YOUTUBE_API_KEY exists: {bool(os.getenv('YOUTUBE_API_KEY'))}")
    logger.info(f"NODE_ENV: {os.getenv('NODE_ENV', 'not set')}")
    
    # Try different methods
    logger.info(f"Testing transcript extraction for video ID: {video_id}")
    
    # Method 1: Direct API call
    try:
        logger.info("Method 1: Direct API call")
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        logger.info(f"Success! Found {len(transcript)} transcript segments")
    except Exception as e:
        logger.error(f"Failed: {type(e).__name__}: {str(e)}")
    
    # Method 2: List transcripts first
    try:
        logger.info("Method 2: List transcripts first")
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        logger.info(f"Available transcripts: {list(transcript_list._manually_created_transcripts.keys())}")
        logger.info(f"Generated transcripts: {list(transcript_list._generated_transcripts.keys())}")
        
        # Try to fetch English transcript if available
        if 'en' in transcript_list._manually_created_transcripts:
            logger.info("Found English manual transcript")
            transcript = transcript_list._manually_created_transcripts['en'].fetch()
            logger.info(f"Success! Found {len(transcript)} transcript segments")
        elif 'en' in transcript_list._generated_transcripts:
            logger.info("Found English generated transcript")
            transcript = transcript_list._generated_transcripts['en'].fetch()
            logger.info(f"Success! Found {len(transcript)} transcript segments")
    except Exception as e:
        logger.error(f"Failed: {type(e).__name__}: {str(e)}")
    
    # Method 3: Try with custom headers for browser emulation
    try:
        logger.info("Method 3: Browser emulation")
        import requests
        from pytube import YouTube
        
        # Set up browser-like headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com'
        }
        
        # First check with pytube
        yt = YouTube(f'https://www.youtube.com/watch?v={video_id}')
        if yt.captions:
            logger.info(f"PyTube found captions: {list(yt.captions.keys())}")
            
            # Try to extract English captions if available
            if 'en' in yt.captions:
                caption_track = yt.captions['en']
                logger.info(f"Found English caption track, extracting...")
                xml_captions = caption_track.xml_captions
                logger.info(f"Caption data length: {len(xml_captions)}")
        else:
            logger.info("PyTube found no captions")
            
        # Try direct YouTube API call with custom headers through monkeypatching
        original_get = requests.get
        
        def patched_get(*args, **kwargs):
            if 'headers' not in kwargs:
                kwargs['headers'] = headers
            else:
                kwargs['headers'].update(headers)
            return original_get(*args, **kwargs)
        
        # Apply the patch
        requests.get = patched_get
        
        try:
            logger.info("Trying API with patched headers")
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            logger.info(f"Success with patched headers! Found {len(transcript)} segments")
        finally:
            # Restore original function
            requests.get = original_get
            
    except Exception as e:
        logger.error(f"Method 3 failed: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    main() 