import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { storage } from '../storage';

// Mock video data for testing
const mockVideo = {
  id: 1,
  userId: 'test-user-1',
  youtubeId: 'test-video-123',
  title: 'Test Video Title',
  channelTitle: 'Test Channel',
  description: 'Test video description',
  thumbnail: 'test-thumbnail.jpg',
  transcript: 'This is a test transcript about artificial intelligence and machine learning.'
};

describe('Content Generation API Endpoints', () => {
  beforeEach(async () => {
    // Setup test data
    await storage.createVideo({
      userId: mockVideo.userId,
      youtubeId: mockVideo.youtubeId,
      title: mockVideo.title,
      channelTitle: mockVideo.channelTitle,
      description: mockVideo.description,
      thumbnail: mockVideo.thumbnail,
      transcript: mockVideo.transcript
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await storage.deleteVideo(mockVideo.id);
  });

  describe('POST /api/videos/:id/generate-enhanced-summary', () => {
    it('should generate a summary successfully', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-enhanced-summary`)
        .send({
          transcriptPreference: 'original',
          includeProfessionalContext: true,
          emphasizeAdditionalInsights: true
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('keyTopics');
      expect(Array.isArray(response.body.data.keyTopics)).toBe(true);
    });

    it('should handle missing video', async () => {
      const response = await request(app)
        .post('/api/videos/999/generate-enhanced-summary')
        .send({})
        .expect(404);

      expect(response.body.message).toContain('Video not found');
    });
  });

  describe('POST /api/videos/:id/generate-report', () => {
    it('should generate a Medium-style report', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-report?type=medium`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data.type).toBe('medium');
    });

    it('should generate a LinkedIn post', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-report?type=linkedin`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data.type).toBe('linkedin');
    });

    it('should reject invalid report type', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-report?type=invalid`)
        .expect(400);

      expect(response.body.message).toContain('Invalid report type');
    });
  });

  describe('POST /api/videos/:id/generate-flashcards', () => {
    it('should generate flashcards successfully', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-flashcards`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('description');
    });
  });

  describe('POST /api/videos/:id/generate-ideas', () => {
    it('should generate blog title ideas', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-ideas?type=blog_titles`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('blog_titles');
    });

    it('should generate social media hooks', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-ideas?type=social_media_hooks`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('social_media_hooks');
    });

    it('should reject invalid idea type', async () => {
      const response = await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-ideas?type=invalid`)
        .expect(400);

      expect(response.body.message).toContain('Invalid idea type');
    });
  });

  describe('GET endpoints for generated content', () => {
    it('should fetch video reports', async () => {
      // First generate a report
      await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-report?type=medium`)
        .expect(201);

      // Then fetch reports
      const response = await request(app)
        .get(`/api/videos/${mockVideo.id}/reports`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('type');
    });

    it('should fetch video flashcard sets', async () => {
      // First generate flashcards
      await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-flashcards`)
        .expect(201);

      // Then fetch flashcard sets
      const response = await request(app)
        .get(`/api/videos/${mockVideo.id}/flashcard-sets`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('description');
    });

    it('should fetch video idea sets', async () => {
      // First generate ideas
      await request(app)
        .post(`/api/videos/${mockVideo.id}/generate-ideas?type=blog_titles`)
        .expect(201);

      // Then fetch idea sets
      const response = await request(app)
        .get(`/api/videos/${mockVideo.id}/idea-sets`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('type');
    });
  });
});