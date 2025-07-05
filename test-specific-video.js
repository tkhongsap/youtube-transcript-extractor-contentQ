import { getVideoTranscriptWithFallbacks, extractVideoId } from './server/youtube.ts';

async function testSpecificVideo() {
  const videoUrl = 'https://www.youtube.com/watch?v=DKrBGOFs0GY';
  const videoId = extractVideoId(videoUrl);
  
  console.log(`Testing transcript extraction for video: ${videoId}`);
  console.log(`Video URL: ${videoUrl}`);
  console.log('---'.repeat(20));
  
  try {
    console.log('Starting transcript extraction with improved fallback strategies...');
    
    const transcript = await getVideoTranscriptWithFallbacks(videoId);
    
    console.log('SUCCESS! Transcript extracted');
    console.log(`Transcript length: ${transcript.length} characters`);
    console.log('---'.repeat(20));
    console.log('First 500 characters:');
    console.log(transcript.substring(0, 500));
    console.log('---'.repeat(20));
    
    if (transcript.length > 1000) {
      console.log('Last 300 characters:');
      console.log(transcript.substring(transcript.length - 300));
    }
    
  } catch (error) {
    console.error('FAILED to extract transcript:', error.message);
    console.error('This indicates the transcript extraction strategies need further improvement');
  }
}

testSpecificVideo();