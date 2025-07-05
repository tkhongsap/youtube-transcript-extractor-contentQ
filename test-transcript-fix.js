import { YoutubeTranscript } from 'youtube-transcript';

async function testMultipleVideos() {
  // Test videos that are likely to have captions
  const testVideos = [
    'jNQXAC9IVRw', // "Me at the zoo" - first YouTube video
    'kJQP7kiw5Fk', // "Despacito" - popular music video
    'dQw4w9WgXcQ', // Rick Roll - might not have captions
    'M7lc1UVf-VE', // "Gangnam Style" - popular video
    'fJ9rUzIMcZQ'  // "Bohemian Rhapsody" - Queen official
  ];

  console.log('Testing transcript availability for multiple videos...\n');

  for (const videoId of testVideos) {
    try {
      console.log(`Testing video ID: ${videoId}`);
      
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en'
      });
      
      if (transcript && transcript.length > 0) {
        console.log(`✅ SUCCESS: Retrieved ${transcript.length} segments`);
        console.log(`   First segment: "${transcript[0].text}"`);
        console.log(`   Total text length: ${transcript.map(t => t.text).join(' ').length} characters\n`);
        
        // If we found a working video, let's use it for further testing
        if (transcript.length > 10) {
          console.log(`🎯 Found good test video: ${videoId}`);
          return videoId;
        }
      } else {
        console.log(`❌ FAILED: No transcript segments returned\n`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}\n`);
    }
  }
  
  return null;
}

async function testTranscriptProcessing(videoId) {
  console.log(`\n=== Testing transcript processing for ${videoId} ===`);
  
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'
    });
    
    // Test the processing logic from the server
    const fullTranscript = transcript.map(entry => entry.text).join(' ');
    console.log(`Full transcript length: ${fullTranscript.length} characters`);
    
    // Test sentence detection
    const sentences = fullTranscript.match(/[^.!?]+[.!?]+/g) || [];
    console.log(`Detected ${sentences.length} sentences`);
    
    // Test paragraph chunking
    let paragraphs = [];
    if (sentences.length < 10) {
      console.log("Using time-based chunking");
      for (let i = 0; i < transcript.length; i += 10) {
        const chunk = transcript.slice(i, i + 10);
        const paragraph = chunk.map(entry => entry.text).join(' ');
        paragraphs.push(paragraph);
      }
    } else {
      console.log("Using sentence-based chunking");
      for (let i = 0; i < sentences.length; i += 5) {
        const paragraph = sentences.slice(i, i + 5).join(' ');
        paragraphs.push(paragraph);
      }
    }
    
    console.log(`Created ${paragraphs.length} paragraphs`);
    console.log(`First paragraph: "${paragraphs[0]?.substring(0, 100)}..."`);
    
    return true;
  } catch (error) {
    console.error(`Error in transcript processing: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 YouTube Transcript Debugging Tool\n');
  
  // First, find a working video
  const workingVideoId = await testMultipleVideos();
  
  if (workingVideoId) {
    // Test the processing logic
    await testTranscriptProcessing(workingVideoId);
    console.log(`\n✅ Use this video ID for testing: ${workingVideoId}`);
  } else {
    console.log('\n❌ No working videos found. This might indicate an issue with the youtube-transcript library or network connectivity.');
  }
}

main().catch(console.error); 