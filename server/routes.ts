import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { searchVideos } from "./youtube";
import { spawn } from "child_process";
import { promisify } from "util";
import { insertSavedContentSchema } from "@shared/schema";
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const mkTempDir = () => {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true, mode: 0o755 });
      } catch (err) {
        console.error('Error creating temp directory:', err);
        throw new Error('Failed to create temporary directory');
      }
    }
    return tmpDir;
  };

// Schema for video URL and analysis options
const analysisOptionsSchema = z.object({
  videoId: z.string(),
  llmProvider: z.enum(["deepseek-v3", "deepseek-r1", "gpt-4o-mini", "o3-mini"]).default("deepseek-r1"),
  type: z.enum(["hooks", "summary", "flashcards"])
});

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

    const pythonProcess = spawn('python3', ['scripts/extract_transcript.py', url]);
    let stderr = '';
    let stdout = '';

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python script error:', data.toString());
    });

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Python script output:', data.toString());
    });

    // Wait for process to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (stdout.trim()) {
          try {
            const result = JSON.parse(stdout);
            if (result.success) {
              resolve(result);
            } else {
              reject(new Error(result.error || 'Unknown error occurred'));
            }
          } catch (err) {
            console.error('Failed to parse Python output:', err);
            reject(new Error('Invalid response from transcript extractor'));
          }
        } else {
          reject(new Error('No output from transcript extractor'));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        reject(err);
      });
    });

    // Parse the output
    const result = JSON.parse(stdout);

    if (!result.success) {
      return res.status(400).json({
        message: result.error,
        errorType: result.errorType,
        details: stderr
      });
    }

    res.json({ transcript: JSON.stringify(result) });
  } catch (error: any) {
    console.error('Transcript extraction failed:', error);
    res.status(error.status || 500).json({
      message: error.message || 'Failed to extract transcript',
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
      const transcriptFile = path.join(tmpDir, `transcript_${Date.now()}.txt`);
      const outputFile = path.join(tmpDir, `analysis_${Date.now()}.json`);

      // First extract transcript
      const pythonProcess = spawn('python3', ['scripts/extract_transcript.py', videoId]);
      let transcriptError = '';

      pythonProcess.stderr.on('data', (data) => {
        console.error('Transcript extraction error:', data.toString());
        transcriptError += data.toString();
      });

      await new Promise((resolve, reject) => {
        let transcript = '';
        pythonProcess.stdout.on('data', (data) => {
          transcript += data.toString();
        });

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
                fs.writeFileSync(transcriptFile, transcriptText, { encoding: 'utf8' });
                resolve(transcriptData);
              } else {
                reject(new Error(transcriptData.error || 'Failed to extract transcript'));
              }
            } catch (err) {
              reject(new Error(`Failed to parse transcript data: ${err.message}`));
            }
          } else {
            reject(new Error(`Transcript extraction failed: ${transcriptError}`));
          }
        });
      });

      // Now analyze the content
      const analyzerProcess = spawn('python3', [
        'scripts/content_analyzer.py',
        transcriptFile,
        type,
        llmProvider,
        outputFile
      ]);

      let analysisError = '';
      analyzerProcess.stderr.on('data', (data) => {
        console.error('Content analysis error:', data.toString());
        analysisError += data.toString();
      });

      await new Promise((resolve, reject) => {
        analyzerProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const analysisData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
              resolve(analysisData);
            } catch (err) {
              reject(new Error(`Failed to parse analysis data: ${err.message}`));
            }
          } else {
            reject(new Error(`Content analysis failed: ${analysisError}`));
          }
        });
      });

      // Read and return the analysis results
      const analysisData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

      // Clean up temp files
      try {
        fs.unlinkSync(transcriptFile);
        fs.unlinkSync(outputFile);
      } catch (err) {
        console.error('Error cleaning up temp files:', err);
      }

      if (!analysisData.success) {
        throw new Error(analysisData.error || "Failed to analyze content");
      }

      res.json(analysisData.data);
    } catch (error: any) {
      console.error(`Analysis error (${req.params.type}):`, error);
      res.status(500).json({ message: error.message });
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