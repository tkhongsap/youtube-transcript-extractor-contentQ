import { YoutubeTranscript } from 'youtube-transcript';

async function testTranscript() {
  const videoId = 'dQw4w9WgXcQ'; // Rick Roll video - should have captions
  
  try {
    console.log(`Testing transcript for video ID: ${videoId}`);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'
    });
    
    console.log(`Success! Retrieved ${transcript.length} transcript segments`);
    console.log('First few segments:');
    transcript.slice(0, 5).forEach((segment, index) => {
      console.log(`${index + 1}. [${segment.offset}ms] ${segment.text}`);
    });
    
    // Test full transcript assembly
    const fullText = transcript.map(entry => entry.text).join(' ');
    console.log(`\nFull transcript length: ${fullText.length} characters`);
    console.log(`First 200 characters: ${fullText.substring(0, 200)}...`);
    
  } catch (error) {
    console.error('Error fetching transcript:', error);
  }
}

testTranscript(); 