import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { searchVideos } from "./youtube";
import { spawn } from "child_process";
import { promisify } from "util";

// Schema for video URL and analysis options
const analysisOptionsSchema = z.object({
  videoId: z.string(),
  llmProvider: z.enum(["deepseek", "openai"]).default("deepseek"),
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

      const pythonProcess = spawn('python3', ['scripts/extract_transcript.py', url]);
      let transcript = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        transcript += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(transcript);
          } else {
            reject(new Error(`Python script failed with error: ${error}`));
          }
        });
      });

      res.json({ transcript });
    } catch (error: any) {
      console.error('Error extracting transcript:', error);
      res.status(error.status || 500).json({
        message: error.message || 'Failed to extract transcript'
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

      // Now analyze the specific content type
      const analyzerProcess = spawn('python3', [
        'scripts/content_analyzer.py',
        transcriptData.transcript,
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

  return httpServer;
}