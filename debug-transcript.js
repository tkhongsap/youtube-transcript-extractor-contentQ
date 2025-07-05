import { YoutubeTranscript } from 'youtube-transcript';

async function debugTranscript() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito - we know this works
  
  try {
    console.log(`Debugging transcript for video ID: ${videoId}`);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'
    });
    
    console.log(`Retrieved ${transcript.length} segments`);
    console.log('First 3 segments:');
    transcript.slice(0, 3).forEach((segment, index) => {
      console.log(`${index + 1}. Segment:`, JSON.stringify(segment, null, 2));
    });
    
    // Test the mapping logic
    console.log('\n=== Testing mapping logic ===');
    const textArray = transcript.map(entry => entry.text);
    console.log('First 3 text entries:', textArray.slice(0, 3));
    
    const fullTranscript = textArray.join(' ');
    console.log(`Full transcript length: ${fullTranscript.length}`);
    console.log(`First 200 characters: "${fullTranscript.substring(0, 200)}"`);
    
    // Check if there are any null/undefined values
    const nullEntries = transcript.filter(entry => !entry.text || entry.text.trim() === '');
    console.log(`Null/empty entries: ${nullEntries.length}`);
    
    if (nullEntries.length > 0) {
      console.log('Sample null entries:', nullEntries.slice(0, 3));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTranscript(); 