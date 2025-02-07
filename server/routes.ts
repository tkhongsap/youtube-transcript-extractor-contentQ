import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { searchVideos } from "./youtube";

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

  app.post("/api/analysis", async (req, res) => {
    const { videoId, llmProvider = "deepseek" } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: "Video ID is required" });
    }

    try {
      const transcript = await getVideoTranscript(videoId);
      const analysis = await analyzeVideo(transcript, llmProvider);

      const sessionId = req.session.id;
      const result = await storage.createAnalysis({
        ...analysis,
        videoId,
        llmProvider,
        sessionId
      });

      res.json(result);
    } catch (error) {
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