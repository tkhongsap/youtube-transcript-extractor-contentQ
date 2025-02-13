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

// At the start of your application
async function verifyEnvironment() {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../scripts/check_setup.py')
    ]);

    let output = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python verification error:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const setupInfo = JSON.parse(output);
          console.log('Environment verification:', setupInfo);
          resolve(setupInfo);
        } catch (error) {
          reject(new Error('Failed to parse environment info'));
        }
      } else {
        reject(new Error('Environment verification failed'));
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

// Add this before starting your server
app.listen(port, async () => {
  try {
    const envInfo = await verifyEnvironment();
    console.log('Server started with environment:', envInfo);
  } catch (error) {
    console.error('Failed to verify environment:', error);
  }
}); 