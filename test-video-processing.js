import { YoutubeTranscript } from 'youtube-transcript';

async function testVideoProcessing() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito - known to work
  
  console.log('=== Testing Full Video Processing Flow ===\n');
  
  try {
    console.log(`1. Fetching transcript for video: ${videoId}`);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'
    });
    
    console.log(`   ✅ Retrieved ${transcript.length} segments`);
    
    if (transcript.length === 0) {
      console.log('   ❌ No transcript segments found');
      return;
    }
    
    console.log('\n2. Processing transcript segments...');
    
    // Debug the first few segments
    console.log('   First 3 segments:');
    transcript.slice(0, 3).forEach((segment, index) => {
      console.log(`   ${index + 1}. [${segment.offset}ms] "${segment.text}"`);
    });
    
    console.log('\n3. Combining transcript text...');
    
    // This is the exact logic from the server
    const fullTranscript = transcript.map(entry => entry.text).join(' ');
    console.log(`   Combined text length: ${fullTranscript.length} characters`);
    
    if (fullTranscript.length === 0) {
      console.log('   ❌ Combined transcript is empty!');
      
      // Debug why it's empty
      console.log('   Debugging empty transcript:');
      const hasText = transcript.filter(entry => entry.text && entry.text.trim().length > 0);
      console.log(`   Segments with text: ${hasText.length}/${transcript.length}`);
      
      if (hasText.length > 0) {
        console.log(`   Sample text segment: "${hasText[0].text}"`);
      }
      
      return;
    }
    
    console.log(`   First 100 characters: "${fullTranscript.substring(0, 100)}..."`);
    
    console.log('\n4. Creating paragraphs...');
    
    // Sentence detection
    const sentences = fullTranscript.match(/[^.!?]+[.!?]+/g) || [];
    console.log(`   Detected ${sentences.length} sentences`);
    
    let paragraphs = [];
    
    if (sentences.length < 10) {
      console.log('   Using time-based chunking (10 segments per paragraph)');
      for (let i = 0; i < transcript.length; i += 10) {
        const chunk = transcript.slice(i, i + 10);
        const paragraph = chunk.map(entry => entry.text).join(' ');
        if (paragraph.trim().length > 0) {
          paragraphs.push(paragraph);
        }
      }
    } else {
      console.log('   Using sentence-based chunking (5 sentences per paragraph)');
      for (let i = 0; i < sentences.length; i += 5) {
        const paragraph = sentences.slice(i, i + 5).join(' ');
        if (paragraph.trim().length > 0) {
          paragraphs.push(paragraph);
        }
      }
    }
    
    console.log(`   Created ${paragraphs.length} paragraphs`);
    
    if (paragraphs.length > 0) {
      console.log(`   First paragraph (100 chars): "${paragraphs[0].substring(0, 100)}..."`);
    }
    
    console.log('\n5. Final formatted transcript:');
    const formattedTranscript = `Full Transcript:\n\n${paragraphs.join('\n\n')}`;
    console.log(`   Total formatted length: ${formattedTranscript.length} characters`);
    console.log(`   Preview: "${formattedTranscript.substring(0, 200)}..."`);
    
    console.log('\n✅ Video processing test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in video processing:', error);
  }
}

testVideoProcessing(); 