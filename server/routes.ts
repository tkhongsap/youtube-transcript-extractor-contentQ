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

// Update mkTempDir function with better error handling
const mkTempDir = () => {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true, mode: 0o755 });
      console.log('Created temporary directory:', tmpDir);
    } catch (err) {
      console.error('Error creating temp directory:', err);
      throw new Error('Failed to create temporary directory');
    }
  }
  return tmpDir;
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

app.post("/api/extract-transcript", async (req, res) => {
  try {
    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    console.log('Extracting transcript for URL:', url);

    // Ensure tmp directory exists
    const tmpDir = mkTempDir();
    console.log('Using temporary directory:', tmpDir);

    const pythonProcess = spawn('python3', ['scripts/extract_transcript.py', url]);
    let stderr = '';
    let stdout = '';

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log all Python script output for debugging
      console.error('Python script error/log:', data.toString());
    });

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Python script output:', data.toString());
    });

    // Enhanced process error handling
    await new Promise((resolve, reject) => {
      let processError = null;

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        processError = err;
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);

        if (processError) {
          reject(processError);
          return;
        }

        if (!stdout.trim()) {
          console.error('No output from Python script');
          console.error('stderr:', stderr);
          reject(new Error('No output from transcript extractor'));
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
          console.error('Failed to parse Python output:', err);
          console.error('Raw output:', stdout);
          reject(new Error('Invalid response from transcript extractor'));
        }
      });
    });

    // Parse and handle the output
    const result = JSON.parse(stdout);

    if (!result.success) {
      const errorResponse = {
        message: result.error,
        errorType: result.errorType,
        details: result.details || stderr,
        metadata: result.metadata
      };

      const statusCodes = {
        'InvalidURL': 400,
        'TranscriptsDisabled': 422,
        'NoTranscriptFound': 404,
        'InvalidInput': 400,
        'UnknownError': 500
      };

      return res.status(statusCodes[result.errorType as keyof typeof statusCodes] || 500)
        .json(errorResponse);
    }

    res.json({ 
      transcript: JSON.stringify(result),
      metadata: result.metadata
    });

  } catch (error: any) {
    console.error('Transcript extraction failed:', error);

    const statusCode = error.code === 'InvalidURL' ? 400 : 500;
    const errorType = error.code || 'UnknownError';

    res.status(statusCode).json({
      message: error.message || 'Failed to extract transcript',
      errorType: errorType,
      details: error.stack
    });
  }
});

app.post("/api/analyze/:type", async (req, res) => {
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

    // Clean up temp files
    try {
      fs.unlinkSync(transcriptFile);
      fs.unlinkSync(outputFile);
      console.log('Cleaned up temporary files');
    } catch (err) {
      console.error('Error cleaning up temp files:', err);
    }

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