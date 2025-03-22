## YouTube Transcript Extraction

This application includes functionality to extract transcripts from YouTube videos. Due to YouTube's restrictions, you may encounter issues with transcript extraction in production environments.

### Troubleshooting Transcript Extraction

If you encounter issues with transcript extraction in production, try these solutions:

1. **Configure a proxy service**:
   ```bash
   # Run the proxy setup utility:
   python scripts/setup_proxy.py
   
   # Or manually add to your .env file:
   HTTPS_PROXY=http://your-proxy-service:port
   HTTP_PROXY=http://your-proxy-service:port
   ```

2. **Use a different proxy for each request** by setting up multiple proxies in your environment variables:
   ```
   # In your .env file:
   PROXY_1=http://user:pass@proxy1.example:port
   PROXY_2=http://user:pass@proxy2.example:port
   # ...
   ```

3. **Run in development mode** if you're just testing or using locally:
   ```bash
   npm run dev
   ```

### Common YouTube API Issues

1. **"Transcripts marked as disabled"**: This sometimes happens even when transcripts are available. It's often due to YouTube's anti-scraping measures. Try using a proxy.

2. **HTTP 400 Bad Request**: This suggests YouTube is identifying your requests as automated. Using a proxy with browser-like headers often resolves this.

3. **Different behavior between development and production**: YouTube treats different IPs and request patterns differently. Production servers (especially from cloud providers) are often on YouTube's watchlist for automated access.

### Using the YouTube Data API

For more reliable access, consider using the official YouTube Data API:

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Add it to your environment variables:
   ```
   YOUTUBE_API_KEY=your_api_key
   ```
3. The application will automatically use this for fetching video metadata.

Note that the YouTube Data API has quotas and doesn't provide full access to all transcripts without OAuth2 authentication. 