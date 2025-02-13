const { spawn } = require('child_process');
const path = require('path');

async function extractTranscript(videoUrl) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../scripts/extract_transcript.py'),
      videoUrl
    ]);

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error output: ${errorData}`);
        reject(new Error(errorData || 'Failed to extract transcript'));
        return;
      }

      try {
        const result = JSON.parse(outputData);
        if (!result.success) {
          reject(new Error(result.error));
          return;
        }
        resolve(result);
      } catch (error) {
        reject(new Error('Failed to parse Python script output'));
      }
    });
  });
}

// Your API endpoint
app.post('/api/extract-transcript', async (req, res) => {
  try {
    const { url } = req.body;
    console.log(`Extracting transcript for URL: ${url}`);
    
    const result = await extractTranscript(url);
    res.json(result);
  } catch (error) {
    console.error('Transcript extraction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}); 