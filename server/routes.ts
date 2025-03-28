import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { searchVideos } from "./youtube";
import { spawn } from "child_process";
import path from 'path';
import fs from 'fs';
import { insertSavedContentSchema } from "@shared/schema";
import axios from 'axios';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Schema for video URL and analysis options
const analysisOptionsSchema = z.object({
  videoId: z.string(),
  llmProvider: z.enum(["deepseek-v3", "deepseek-r1", "gpt-4o-mini", "o3-mini"]).default("deepseek-r1"),
  type: z.enum(["hooks", "summary", "flashcards"])
});

// Enhanced temporary directory management
const mkTempDir = () => {
  try {
    // Log current working directory
    const cwd = process.cwd();
    console.log('Current working directory:', cwd);

    // Create absolute path for tmp directory
    const tmpDir = path.join(cwd, 'tmp');
    console.log('Attempting to create/verify tmp directory at:', tmpDir);

    // Check if tmp directory exists
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true, mode: 0o755 });
      console.log('Created new temporary directory');
    } else {
      // Verify write permissions
      try {
        const testFile = path.join(tmpDir, `test_${Date.now()}.txt`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('Verified write permissions in tmp directory');
      } catch (err) {
        console.error('Failed to verify write permissions:', err);
        throw new Error('No write permissions in temporary directory');
      }
    }

    // Log directory stats
    const stats = fs.statSync(tmpDir);
    console.log('Tmp directory details:', {
      mode: stats.mode,
      uid: stats.uid,
      gid: stats.gid,
      size: stats.size
    });

    return tmpDir;
  } catch (err) {
    console.error('Fatal error in mkTempDir:', err);
    throw new Error(`Failed to setup temporary directory: ${err.message}`);
  }
};

// Safe file cleanup utility
const safeCleanup = (filePaths: string[]) => {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Successfully cleaned up file:', filePath);
      }
    } catch (err) {
      console.warn(`Failed to clean up file ${filePath}:`, err);
    }
  }
};

// Retry logic with exponential backoff
const retryWithBackoff = async (
  operation: () => Promise<any>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY
): Promise<any> => {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }

      // Check if error is retriable
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' || error.response?.status === 429) {
        console.log(`Retry ${retries}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      throw error;
    }
  }
};

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/videos", async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const topic = req.query.topic as string || 'all';
      const sortBy = (req.query.sortBy as string) || 'date';
      const videos = await searchVideos(query, topic, sortBy as any);
      res.json(videos);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/diagnostics/youtube", async (req, res) => {
    try {
      const scriptPath = path.join(process.cwd(), 'scripts', 'youtube_diagnostics.py');
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Diagnostics script not found at ${scriptPath}`);
      }
      
      const { videoId } = req.query;
      const testVideoId = videoId?.toString() || 'jNQXAC9IVRw'; // Default to first YouTube video
      
      console.log('Running YouTube diagnostics with video ID:', testVideoId);
      
      const pythonProcess = spawn('python3', [scriptPath, testVideoId]);
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('Python diagnostics output:', data.toString());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('Python diagnostics error/log:', data.toString());
      });
      
      pythonProcess.on('close', (code) => {
        res.json({
          status: code === 0 ? 'success' : 'error',
          stdout,
          stderr,
          environment: {
            nodeEnv: process.env.NODE_ENV,
            isProd: process.env.NODE_ENV === 'production',
            host: req.headers.host,
            userAgent: req.headers['user-agent']
          }
        });
      });
    } catch (error: any) {
      res.status(500).json({
        message: error.message || 'Diagnostics failed',
        stack: error.stack
      });
    }
  });

app.post("/api/extract-transcript", async (req, res) => {
    let tempFiles: string[] = [];
    try {
      const { url } = z.object({ url: z.string().url() }).parse(req.body);
      console.log('Extracting transcript for URL:', url);
      
      // Log environment information to help debug production issues
      console.log('Environment:', {
        nodeEnv: process.env.NODE_ENV,
        isProd: process.env.NODE_ENV === 'production',
        host: req.headers.host
      });

      // Setup temporary directory with enhanced error handling
      const tmpDir = mkTempDir();
      console.log('Using temporary directory:', tmpDir);

      // Verify Python script exists
      const scriptPath = path.join(process.cwd(), 'scripts', 'extract_transcript.py');
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Python script not found at ${scriptPath}`);
      }
      console.log('Found Python script at:', scriptPath);

      // Use retry logic for transcript extraction
      const extractTranscript = async () => {
        return new Promise((resolve, reject) => {
          const pythonProcess = spawn('python3', [scriptPath, url]);
          let stderr = '';
          let stdout = '';

          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error('Python script error/log:', data.toString());
          });

          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log('Python script output:', data.toString());
          });

          let processError: Error | null = null;

          pythonProcess.on('error', (err) => {
            console.error('Failed to start Python process:', err);
            processError = err;
          });

          pythonProcess.on('close', (code) => {
            if (processError) {
              reject(processError);
              return;
            }

            if (code !== 0 || !stdout.trim()) {
              reject(new Error(`Transcript extraction failed with code ${code}: ${stderr}`));
              return;
            }

            try {
              const result = JSON.parse(stdout);
              if (result.success) {
                resolve(result);
              } else {
                const error = new Error(result.error || 'Unknown error occurred');
                error.code = result.errorType;
                error.details = result.details;
                reject(error);
              }
            } catch (err) {
              reject(new Error('Invalid response from transcript extractor'));
            }
          });
        });
      };

      // Execute with retry logic
      const result = await retryWithBackoff(extractTranscript);

      if (!result.success) {
        const errorResponse = {
          message: result.error,
          errorType: result.errorType,
          details: result.details,
          metadata: result.metadata
        };

        const statusCodes = {
          'InvalidURL': 400,
          'TranscriptsDisabled': 422,
          'NoTranscriptFound': 404,
          'InvalidInput': 400,
          'RateLimitExceeded': 429,
          'NetworkError': 503,
          'UnknownError': 500
        };

        return res.status(statusCodes[result.errorType as keyof typeof statusCodes] || 500)
          .json(errorResponse);
      }

      // Return the raw result without additional stringification
      res.json({
        success: true,
        transcript: result.transcript,
        type: result.type,
        metadata: result.metadata
      });

    } catch (error: any) {
      console.error('Transcript extraction failed:', error);

      const statusCode = error.code === 'InvalidURL' ? 400 :
                        error.code === 'RateLimitExceeded' ? 429 :
                        error.code === 'NetworkError' ? 503 : 500;

      res.status(statusCode).json({
        message: error.message || 'Failed to extract transcript',
        errorType: error.code || 'UnknownError',
        details: error.stack
      });
    } finally {
      // Clean up any temporary files
      if (tempFiles.length > 0) {
        safeCleanup(tempFiles);
      }
    }
  });

  app.post("/api/analyze/:type", async (req, res) => {
    let tempFiles: string[] = [];
    try {
      const { videoId, llmProvider, type } = analysisOptionsSchema.parse({
        ...req.body,
        type: req.params.type
      });

      // Create temp directory if it doesn't exist
      const tmpDir = mkTempDir();
      console.log('Created/verified temp directory:', tmpDir);

      const transcriptFile = path.join(tmpDir, `transcript_${Date.now()}.txt`);
      const outputFile = path.join(tmpDir, `analysis_${Date.now()}.json`);
      tempFiles.push(transcriptFile, outputFile);

      // First extract transcript
      const pythonProcess = spawn('python3', ['scripts/extract_transcript.py', videoId]);
      let transcriptError = '';
      let transcript = '';

      pythonProcess.stderr.on('data', (data) => {
        console.error('Transcript extraction error:', data.toString());
        transcriptError += data.toString();
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log('Transcript extraction output:', data.toString());
        transcript += data.toString();
      });

      // Wait for transcript extraction to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const transcriptData = JSON.parse(transcript);
              if (transcriptData.success) {
                // Convert transcript array to text format for analysis
                let transcriptText;
                if (Array.isArray(transcriptData.transcript)) {
                  transcriptText = transcriptData.transcript
                    .map(entry => entry.text)
                    .join('\n');
                } else {
                  transcriptText = transcriptData.transcript;
                }

                console.log('Writing transcript to file:', transcriptFile);
                console.log('Transcript length:', transcriptText.length);

                fs.writeFileSync(transcriptFile, transcriptText, { encoding: 'utf8' });

                // Verify file was written
                if (fs.existsSync(transcriptFile)) {
                  const stats = fs.statSync(transcriptFile);
                  console.log('Transcript file size:', stats.size);
                  resolve(transcriptData);
                } else {
                  reject(new Error('Failed to write transcript file'));
                }
              } else {
                reject(new Error(transcriptData.error || 'Failed to extract transcript'));
              }
            } catch (err) {
              reject(new Error(`Failed to parse transcript data: ${err.message}`));
            }
          } else {
            reject(new Error(`Transcript extraction failed with code ${code}: ${transcriptError}`));
          }
        });
      });

      // Now analyze the content
      console.log('Starting content analysis with:', {
        transcriptFile,
        type,
        llmProvider,
        outputFile
      });

      const analyzerProcess = spawn('python3', [
        'scripts/content_analyzer.py',
        transcriptFile,
        type,
        llmProvider,
        outputFile
      ]);

      let analysisError = '';
      let analysisOutput = '';

      analyzerProcess.stderr.on('data', (data) => {
        console.error('Content analysis error:', data.toString());
        analysisError += data.toString();
      });

      analyzerProcess.stdout.on('data', (data) => {
        console.log('Content analysis output:', data.toString());
        analysisOutput += data.toString();
      });

      await new Promise((resolve, reject) => {
        analyzerProcess.on('close', (code) => {
          if (code === 0) {
            try {
              if (fs.existsSync(outputFile)) {
                const analysisData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
                resolve(analysisData);
              } else {
                reject(new Error('Analysis output file not found'));
              }
            } catch (err) {
              reject(new Error(`Failed to parse analysis data: ${err.message}`));
            }
          } else {
            reject(new Error(`Content analysis failed with code ${code}: ${analysisError}`));
          }
        });
      });

      // Read and return the analysis results
      console.log('Reading analysis results from:', outputFile);
      const analysisData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));


      if (!analysisData.success) {
        throw new Error(analysisData.error || "Failed to analyze content");
      }

      res.json(analysisData.data);
    } catch (error: any) {
      console.error(`Analysis error (${req.params.type}):`, error);
      res.status(500).json({
        message: error.message,
        type: req.params.type,
        details: error.stack
      });
    } finally {
      safeCleanup(tempFiles);
    }
  });

  app.get("/api/analysis/:videoId", async (req, res) => {
    const { videoId } = req.params;

    try {
      const analysis = await storage.getAnalysisByVideoId(videoId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add new routes for saved content
  app.post("/api/saved-content", async (req, res) => {
    try {
      console.log('Saving content request:', req.body);
      // Extract video ID from URL
      let videoId = req.body.videoId;
      if (videoId.includes('youtu.be/')) {
        videoId = videoId.split('youtu.be/')[1].split('?')[0];
      } else if (videoId.includes('youtube.com/watch?v=')) {
        videoId = videoId.split('v=')[1].split('&')[0];
      }

      const content = insertSavedContentSchema.parse({
        ...req.body,
        videoId
      });

      const savedContent = await storage.createSavedContent(content);
      console.log('Content saved successfully:', savedContent);
      res.json(savedContent);
    } catch (error: any) {
      console.error('Error saving content:', error);
      res.status(500).json({
        message: error.message || "Failed to save content"
      });
    }
  });

  app.get("/api/saved-content", async (_req, res) => {
    try {
      console.log('Fetching saved content');
      const savedContent = await storage.getSavedContent();
      console.log('Found saved content:', savedContent.length, 'items');
      res.json(savedContent);
    } catch (error: any) {
      console.error('Error fetching saved content:', error);
      res.status(500).json({
        message: error.message || "Failed to fetch saved content"
      });
    }
  });

  app.delete("/api/saved-content/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      console.log('Deleting saved content:', id);
      await storage.deleteSavedContent(id);
      console.log('Content deleted successfully');
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting content:', error);
      res.status(500).json({
        message: error.message || "Failed to delete content"
      });
    }
  });

  app.post("/api/serper-search", async (req, res) => {
    try {
      console.log('Received search request:', req.body);
      const { query } = req.body;

      const serperData = {
        q: query,
        num: 40,
        engine: "google"
      };

      console.log('Sending request to Serper API:', serperData);

      const response = await axios.post('https://google.serper.dev/videos', serperData, {
        headers: {
          'X-API-KEY': '72b4c075831b8850b37f430c2908f7e7099aa80c',
          'Content-Type': 'application/json'
        }
      });

      console.log('Received response from Serper:', response.data);

      const videos = response.data.videos.map((video: any) => ({
        videoId: video.link.split('v=')[1]?.split('&')[0] || '',
        title: video.title,
        thumbnail: video.imageUrl,
        channelName: video.channel,
        publishedAt: video.date
      }));

      res.json({ videos });
    } catch (error: any) {
      console.error('Serper API error:', error.response?.data || error.message);
      res.status(500).json({
        message: "Failed to perform search",
        error: error.response?.data || error.message
      });
    }
  });

  return httpServer;
}