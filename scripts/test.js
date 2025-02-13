const axios = require('axios');

const testVideos = [
  'known_working_video_1',
  'known_working_video_2'
];

async function runTests() {
  for (const videoId of testVideos) {
    try {
      const response = await axios.post('http://localhost:5000/api/extract-transcript', {
        url: `https://youtube.com/watch?v=${videoId}`
      });
      console.log(`Test for ${videoId}: SUCCESS`);
      console.log(response.data);
    } catch (error) {
      console.error(`Test for ${videoId}: FAILED`);
      console.error(error.response?.data || error.message);
    }
  }
}

runTests(); 