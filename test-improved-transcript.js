import { YoutubeTranscript } from 'youtube-transcript';

async function testImprovedTranscript() {
  console.log('🔍 Testing Improved YouTube Transcript Functionality\n');
  
  // Test videos with different caption availability
  const testVideos = [
    { id: 'kJQP7kiw5Fk', name: 'Despacito (Popular music video)' },
    { id: 'jNQXAC9IVRw', name: 'Me at the zoo (First YouTube video)' },
    { id: 'M7lc1UVf-VE', name: 'Gangnam Style (Popular video)' },
    { id: 'dQw4w9WgXcQ', name: 'Rick Roll (May not have captions)' },
    { id: 'fJ9rUzIMcZQ', name: 'Bohemian Rhapsody (Queen official)' }
  ];

  for (const video of testVideos) {
    console.log(`\n=== Testing: ${video.name} (${video.id}) ===`);
    
    // Test multiple strategies
    const strategies = [
      { name: 'English captions', options: { lang: 'en' } },
      { name: 'Auto-generated captions', options: {} },
      { name: 'US English captions', options: { lang: 'en-US' } }
    ];

    let foundTranscript = false;
    
    for (const strategy of strategies) {
      try {
        console.log(`  Trying: ${strategy.name}...`);
        
        const transcript = await YoutubeTranscript.fetchTranscript(video.id, strategy.options);
        
        if (transcript && transcript.length > 0) {
          console.log(`  ✅ SUCCESS with ${strategy.name}`);
          console.log(`     Retrieved ${transcript.length} segments`);
          
          const fullText = transcript.map(entry => entry.text).join(' ');
          console.log(`     Total text length: ${fullText.length} characters`);
          
          if (fullText.length > 0) {
            console.log(`     First 100 chars: "${fullText.substring(0, 100)}..."`);
            foundTranscript = true;
            break;
          }
        }
      } catch (error) {
        console.log(`  ❌ Failed with ${strategy.name}: ${error.message}`);
      }
    }
    
    if (!foundTranscript) {
      console.log(`  ⚠️  No transcript found for ${video.name}`);
    }
  }
  
  console.log('\n=== Testing Complete ===');
}

testImprovedTranscript().catch(console.error); 