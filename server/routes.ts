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

  // New endpoint for transcript extraction
  app.post("/api/extract-transcript", async (req, res) => {
    try {
      const { url } = z.object({ url: z.string().url() }).parse(req.body);
      console.log('Extracting transcript for URL:', url);

      const pythonProcess = spawn('python3', ['scripts/extract_transcript.py', url]);
      let transcript = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        console.log('Python script output:', data.toString());
        transcript += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Python script error:', data.toString());
        error += data.toString();
      });

      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          console.log('Python script exited with code:', code);
          if (code === 0) {
            resolve(transcript);
          } else {
            reject(new Error(`Python script failed with error: ${error}`));
          }
        });
      });

      if (!transcript) {
        throw new Error('No transcript data received from Python script');
      }

      res.json({ transcript });
    } catch (error: any) {
      console.error('Error extracting transcript:', error);
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

      // Get the transcript first
      const pythonProcess = spawn('python3', ['scripts/extract_transcript.py', videoId]);
      let transcriptOutput = '';
      let transcriptError = '';

      pythonProcess.stdout.on('data', (data) => {
        transcriptOutput += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        transcriptError += data.toString();
      });

      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(transcriptOutput);
          } else {
            reject(new Error(`Transcript extraction failed: ${transcriptError}`));
          }
        });
      });

      const transcriptData = JSON.parse(transcriptOutput);
      if (!transcriptData.success) {
        throw new Error(transcriptData.error || "Failed to extract transcript");
      }

      // Write transcript to a temporary file
      const tmpDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir);
      }
      const tmpFile = path.join(tmpDir, `transcript_${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, transcriptData.transcript);

      // Now analyze the specific content type using the temp file
      const analyzerProcess = spawn('python3', [
        'scripts/content_analyzer.py',
        tmpFile,
        type,
        llmProvider
      ]);

      let analysisOutput = '';
      let analysisError = '';

      analyzerProcess.stdout.on('data', (data) => {
        analysisOutput += data.toString();
      });

      analyzerProcess.stderr.on('data', (data) => {
        analysisError += data.toString();
      });

      await new Promise((resolve, reject) => {
        analyzerProcess.on('close', (code) => {
          // Clean up the temporary file
          try {
            fs.unlinkSync(tmpFile);
          } catch (err) {
            console.error('Error cleaning up temp file:', err);
          }

          if (code === 0) {
            resolve(analysisOutput);
          } else {
            reject(new Error(`Content analysis failed: ${analysisError}`));
          }
        });
      });

      const analysisData = JSON.parse(analysisOutput);
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