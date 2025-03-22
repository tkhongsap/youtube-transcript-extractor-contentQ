#!/usr/bin/env python3
"""
YouTube Diagnostics Tool

This script performs diagnostics on YouTube transcript extraction functionalities.
It helps to identify issues with YouTube API access, network connectivity,
and transcript extraction methods.
"""

import sys
import os
import json
import random
import platform
import requests
import traceback
from urllib.parse import urlparse, parse_qs
import isodate
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import JSONFormatter
from pytube import YouTube
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

def environment_info():
    """Gather environment information."""
    info = {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "system": platform.system(),
        "processor": platform.processor(),
        "architecture": platform.architecture(),
        "node_env": os.environ.get("NODE_ENV", "development"),
        "is_prod": os.environ.get("NODE_ENV") == "production",
    }
    return info

def test_youtube_connectivity():
    """Test basic connectivity to YouTube."""
    user_agent = get_random_user_agent()
    
    test_urls = [
        "https://www.youtube.com/",
        "https://www.youtube.com/watch?v=jNQXAC9IVRw",  # First YouTube video
        "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=jNQXAC9IVRw"
    ]
    
    results = []
    session = requests.Session()
    
    # Set common headers for all requests to mimic a real browser
    session.headers.update({
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    })
    
    # First establish a session by visiting the YouTube homepage
    home_result = {"url": "https://www.youtube.com/", "success": False, "status_code": None, "error": None}
    
    try:
        # Visit YouTube homepage first to set cookies
        home_resp = session.get("https://www.youtube.com/", timeout=10)
        home_result["status_code"] = home_resp.status_code
        home_result["success"] = 200 <= home_resp.status_code < 300
        home_result["cookies"] = {k: v for k, v in session.cookies.items()}
        home_result["headers"] = dict(home_resp.headers)
    except Exception as e:
        home_result["error"] = str(e)
    
    results.append(home_result)
    
    # Now test the specific URLs with the established session
    for url in test_urls[1:]:  # Skip homepage since we already tested it
        result = {"url": url, "success": False, "status_code": None, "error": None}
        
        try:
            resp = session.get(url, timeout=10)
            result["status_code"] = resp.status_code
            result["success"] = 200 <= resp.status_code < 300
            result["headers"] = dict(resp.headers)
            
            # For the API URL, we want to check the response content
            if "googleapis.com" in url:
                result["api_response"] = resp.json() if "application/json" in resp.headers.get("content-type", "") else None
        except Exception as e:
            result["error"] = str(e)
        
        results.append(result)
    
    return results

def test_transcript_extraction(video_id):
    """Test different transcript extraction methods."""
    results = {}
    
    # Create a browser-like session
    session = requests.Session()
    user_agent = get_random_user_agent()
    
    session.headers.update({
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    })
    
    # 1. Test YouTubeTranscriptApi standard approach
    results["youtube_transcript_api"] = {"success": False, "error": None, "data": None}
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        formatter = JSONFormatter()
        transcript_json = formatter.format_transcript(transcript_list)
        results["youtube_transcript_api"]["success"] = True
        results["youtube_transcript_api"]["data"] = json.loads(transcript_json)
    except Exception as e:
        results["youtube_transcript_api"]["error"] = str(e)
        results["youtube_transcript_api"]["traceback"] = traceback.format_exc()
    
    # 2. Test PyTube approach
    results["pytube"] = {"success": False, "error": None, "data": None}
    try:
        # First visit YouTube homepage to set up cookies
        home_resp = session.get("https://www.youtube.com/", timeout=10)
        
        # Now use PyTube with our session headers
        yt = YouTube(f"https://www.youtube.com/watch?v={video_id}")
        yt.bypass_age_gate = True
        
        results["pytube"]["video_info"] = {
            "title": yt.title,
            "author": yt.author,
            "length": yt.length,
            "views": yt.views,
            "captions_available": len(yt.captions) > 0,
            "caption_tracks": [c.code for c in yt.captions]
        }
        
        if len(yt.captions) > 0:
            # Get the English captions if available, otherwise get the first available
            caption_track = None
            for code in ['en', 'a.en']:
                if code in [c.code for c in yt.captions]:
                    caption_track = yt.captions[code]
                    break
            
            if not caption_track and len(yt.captions) > 0:
                caption_track = list(yt.captions.values())[0]
            
            if caption_track:
                transcript = caption_track.generate_srt_captions()
                results["pytube"]["data"] = transcript
                results["pytube"]["success"] = True
        else:
            results["pytube"]["error"] = "No captions available for this video"
    except Exception as e:
        results["pytube"]["error"] = str(e)
        results["pytube"]["traceback"] = traceback.format_exc()
    
    # 3. Test custom browser emulation approach
    results["browser_emulation"] = {"success": False, "error": None, "data": None}
    try:
        # First visit YouTube homepage to establish cookies
        home_resp = session.get("https://www.youtube.com/", timeout=10)
        
        # Then get the watch page to set more cookies
        watch_resp = session.get(f"https://www.youtube.com/watch?v={video_id}", timeout=10)
        
        # Now fetch transcript data using timedtext API
        # This mimics what the browser does internally
        timedtext_url = f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en"
        timedtext_resp = session.get(timedtext_url, timeout=10)
        
        results["browser_emulation"]["cookies"] = {k: v for k, v in session.cookies.items()}
        results["browser_emulation"]["status_code"] = timedtext_resp.status_code
        results["browser_emulation"]["headers"] = dict(timedtext_resp.headers)
        results["browser_emulation"]["content_type"] = timedtext_resp.headers.get("content-type")
        
        if timedtext_resp.status_code == 200:
            results["browser_emulation"]["success"] = True
            results["browser_emulation"]["data"] = timedtext_resp.text[:1000]  # Limit to 1000 chars
    except Exception as e:
        results["browser_emulation"]["error"] = str(e)
        results["browser_emulation"]["traceback"] = traceback.format_exc()
    
    return results

def main():
    """Run diagnostics and output results."""
    if len(sys.argv) < 2:
        video_id = "jNQXAC9IVRw"  # Default to first YouTube video
    else:
        video_id = sys.argv[1]
        
        # Extract video ID if a full URL was passed
        if "youtube.com" in video_id or "youtu.be" in video_id:
            if "youtube.com" in video_id:
                query = urlparse(video_id).query
                params = parse_qs(query)
                video_id = params.get("v", [""])[0]
            elif "youtu.be" in video_id:
                video_id = urlparse(video_id).path.lstrip("/")
    
    results = {
        "timestamp": isodate.datetime_isoformat(isodate.parse_datetime("now")),
        "video_id": video_id,
        "environment": environment_info(),
        "connectivity": test_youtube_connectivity(),
        "transcript_extraction": test_transcript_extraction(video_id)
    }
    
    # Print results as JSON
    print(json.dumps(results, indent=2))
    
    # Analyze success/failure patterns
    extraction_success = any([
        results["transcript_extraction"]["youtube_transcript_api"]["success"],
        results["transcript_extraction"]["pytube"]["success"],
        results["transcript_extraction"]["browser_emulation"]["success"]
    ])
    
    connectivity_success = all([r["success"] for r in results["connectivity"]])
    
    if not connectivity_success:
        print("DIAGNOSTIC RESULT: Network connectivity issues to YouTube detected.", file=sys.stderr)
        return 1
    elif not extraction_success:
        print("DIAGNOSTIC RESULT: All transcript extraction methods failed.", file=sys.stderr)
        print("Consider checking if the video has captions available.", file=sys.stderr)
        return 1
    else:
        print("DIAGNOSTIC RESULT: At least one transcript extraction method succeeded.", file=sys.stderr)
        print(f"Best method: {next((k for k, v in results['transcript_extraction'].items() if v['success']), None)}", file=sys.stderr)
        return 0

if __name__ == "__main__":
    sys.exit(main())