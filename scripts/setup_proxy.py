#!/usr/bin/env python
"""
Proxy Setup Script for YouTube Access
This script helps configure and test proxy servers for accessing YouTube content.
"""
import os
import sys
import json
import logging
import requests
import time
import random
from dotenv import load_dotenv, set_key

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_proxy(proxy_url):
    """Test if a proxy works for accessing YouTube."""
    try:
        logger.info(f"Testing proxy: {proxy_url}")
        
        # Configure proxy
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        # Use browser-like headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        }
        
        # First test with a simple request
        response = requests.get(
            'https://www.google.com', 
            proxies=proxies, 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code != 200:
            logger.error(f"Basic connectivity test failed: {response.status_code}")
            return False
            
        logger.info("Basic connectivity test passed")
        
        # Now test YouTube access
        response = requests.get(
            'https://www.youtube.com', 
            proxies=proxies, 
            headers=headers, 
            timeout=15
        )
        
        if response.status_code != 200:
            logger.error(f"YouTube access test failed: {response.status_code}")
            return False
            
        # Try to access a specific video to test deeper access
        test_video_id = 'dQw4w9WgXcQ'  # A popular video unlikely to be removed
        
        # Add random delay to appear more human-like
        time.sleep(random.uniform(1.0, 3.0))
        
        response = requests.get(
            f'https://www.youtube.com/watch?v={test_video_id}',
            proxies=proxies,
            headers=headers,
            timeout=15
        )
        
        if response.status_code != 200:
            logger.error(f"Video page test failed: {response.status_code}")
            return False
            
        logger.info("✅ Proxy test passed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Proxy test failed with error: {str(e)}")
        return False

def update_env_file(proxy_url):
    """Update the .env file with the proxy settings."""
    try:
        env_path = os.path.join(os.getcwd(), '.env')
        
        # Load current .env file
        load_dotenv(env_path)
        
        # Update proxy settings
        set_key(env_path, 'HTTPS_PROXY', proxy_url)
        set_key(env_path, 'HTTP_PROXY', proxy_url)
        
        logger.info(f"✅ Updated .env file with proxy settings")
        return True
    except Exception as e:
        logger.error(f"Failed to update .env file: {str(e)}")
        return False

def main():
    """Main function to set up and test proxy."""
    logger.info("YouTube Proxy Setup Utility")
    logger.info("===========================")
    
    if len(sys.argv) > 1:
        proxy_url = sys.argv[1]
    else:
        proxy_url = input("Enter proxy URL (format: http://user:pass@host:port): ").strip()
    
    if not proxy_url:
        logger.error("No proxy URL provided. Exiting.")
        sys.exit(1)
    
    # Test the proxy
    if test_proxy(proxy_url):
        # Update the .env file
        if update_env_file(proxy_url):
            logger.info("\n✅ Proxy setup completed successfully")
            logger.info("You can now use the application to access YouTube content through this proxy")
        else:
            logger.warning("⚠️ Proxy works but failed to update .env file")
    else:
        logger.error("❌ Proxy test failed. Please check your proxy settings and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main() 