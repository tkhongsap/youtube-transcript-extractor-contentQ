import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { storage } from '../storage';
import * as openai from '../openai';

// Mock OpenAI functions to avoid actual API calls during testing
vi.mock('../openai', () => ({
  generateVideoSummaryEnhanced: vi.fn(),
  generateMediumReportEnhanced: vi.fn(),
  generateLinkedInPostEnhanced: vi.fn(),
}));

const mockedOpenAI = vi.mocked(openai);

describe('Transcript Enhancement Integration Tests', () => {
  let testUserId: string;
  let testVideoId: number;
  let authCookie: string;

  beforeAll(async () => {
    // Set up test user and authentication
    testUserId = 'test-user-ai-integration';
    
    // Create test user
    await storage.upsertUser({
      id: testUserId,
      email: 'test-ai@example.com',
      firstName: 'Test',
      lastName: 'User',
    });

    // Mock authentication for integration tests
    authCookie = 'test-auth-cookie';
  });

  afterAll(async () => {
    // Clean up test data
    if (testVideoId) {
      await storage.deleteVideo(testVideoId);
    }
    await storage.deleteUser(testUserId);
  });

  beforeEach(async () => {
    // Create a test video for each test
    const video = await storage.createVideo({
      userId: testUserId,
      youtubeId: 'test-video-ai-integration',
      title: 'Test Video for AI Integration',
      transcript: 'This is the original transcript content for testing AI integration with enhanced transcripts.',
      channelTitle: 'Test Channel',
      description: 'Test video description',
      duration: '10:30',
    });
    testVideoId = video.id;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (testVideoId) {
      await storage.deleteVideo(testVideoId);
    }
  });

  describe('Enhanced Summary Generation', () => {
    it('should generate enhanced summary when additional text exists', async () => {
      // Setup: Add additional text to the video
      await storage.createAdditionalText({
        id: 'test-additional-1',
        videoId: testVideoId,
        content: 'This is important additional context that enhances the original transcript.',
        label: 'Context',
        timestamp: 30,
      });

      await storage.createAdditionalText({
        id: 'test-additional-2',
        videoId: testVideoId,
        content: 'This corrects an error in the original transcript.',
        label: 'Correction',
        timestamp: 60,
      });

      // Mock OpenAI response
      const mockSummaryResponse = {
        summary: 'Enhanced summary incorporating additional context and corrections.',
        keyTopics: ['Original Content', 'Additional Context', 'Corrections'],
      };
      mockedOpenAI.generateVideoSummaryEnhanced.mockResolvedValue(mockSummaryResponse);

      // Act: Generate enhanced summary
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-summary`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'enhanced',
          includeProfessionalContext: true,
          emphasizeAdditionalInsights: true,
        })
        .expect(201);

      // Assert: Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe(mockSummaryResponse.summary);
      expect(response.body.data.keyTopics).toEqual(mockSummaryResponse.keyTopics);
      expect(response.body.meta.usedEnhancedTranscript).toBe(true);
      expect(response.body.meta.transcriptPreference).toBe('enhanced');

      // Verify OpenAI was called with correct parameters
      expect(mockedOpenAI.generateVideoSummaryEnhanced).toHaveBeenCalledWith(
        'This is the original transcript content for testing AI integration with enhanced transcripts.',
        expect.stringContaining('This is important additional context'),
        'Test Video for AI Integration',
        expect.objectContaining({
          useEnhanced: true,
          includeProfessionalContext: true,
          emphasizeAdditionalInsights: true,
        })
      );
    });

    it('should use original transcript when no additional text exists', async () => {
      // Mock OpenAI response
      const mockSummaryResponse = {
        summary: 'Summary based on original transcript only.',
        keyTopics: ['Original Content'],
      };
      mockedOpenAI.generateVideoSummaryEnhanced.mockResolvedValue(mockSummaryResponse);

      // Act: Generate enhanced summary (should fallback to original)
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-summary`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'auto',
        })
        .expect(201);

      // Assert: Should use original transcript
      expect(response.body.meta.usedEnhancedTranscript).toBe(false);
      
      // Verify OpenAI was called with original transcript only
      expect(mockedOpenAI.generateVideoSummaryEnhanced).toHaveBeenCalledWith(
        'This is the original transcript content for testing AI integration with enhanced transcripts.',
        undefined, // No enhanced transcript
        'Test Video for AI Integration',
        expect.objectContaining({
          useEnhanced: false,
        })
      );
    });

    it('should respect transcriptPreference override', async () => {
      // Setup: Add additional text
      await storage.createAdditionalText({
        id: 'test-additional-override',
        videoId: testVideoId,
        content: 'Additional text that should be ignored.',
        label: 'Context',
      });

      // Mock OpenAI response
      mockedOpenAI.generateVideoSummaryEnhanced.mockResolvedValue({
        summary: 'Original transcript summary.',
        keyTopics: ['Original'],
      });

      // Act: Force original transcript usage
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-summary`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'original',
        })
        .expect(201);

      // Assert: Should use original despite additional text existing
      expect(response.body.meta.usedEnhancedTranscript).toBe(false);
      expect(response.body.meta.transcriptPreference).toBe('original');
    });
  });

  describe('Enhanced Report Generation', () => {
    beforeEach(async () => {
      // Add additional text for report tests
      await storage.createAdditionalText({
        id: 'test-report-additional',
        videoId: testVideoId,
        content: 'Professional insight that adds business value.',
        label: 'Insight',
        timestamp: 45,
      });
    });

    it('should generate enhanced Medium report', async () => {
      // Mock OpenAI response
      const mockReportResponse = {
        title: 'Enhanced Medium Article with Additional Insights',
        content: 'Full Medium article content incorporating additional insights.',
      };
      mockedOpenAI.generateMediumReportEnhanced.mockResolvedValue(mockReportResponse);

      // Act: Generate enhanced Medium report
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-report?type=medium`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'auto',
          emphasizeAdditionalInsights: true,
        })
        .expect(201);

      // Assert: Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(mockReportResponse.title);
      expect(response.body.data.content).toBe(mockReportResponse.content);
      expect(response.body.data.type).toBe('medium_enhanced');
      expect(response.body.meta.usedEnhancedTranscript).toBe(true);

      // Verify OpenAI was called correctly
      expect(mockedOpenAI.generateMediumReportEnhanced).toHaveBeenCalledWith(
        'This is the original transcript content for testing AI integration with enhanced transcripts.',
        expect.stringContaining('Professional insight that adds business value'),
        'Test Video for AI Integration',
        '', // summaryText (empty for new video)
        expect.objectContaining({
          useEnhanced: true,
          emphasizeAdditionalInsights: true,
        })
      );
    });

    it('should generate enhanced LinkedIn post', async () => {
      // Mock OpenAI response
      const mockPostResponse = {
        title: 'LinkedIn Post Title',
        content: 'Professional LinkedIn post content with enhanced insights.',
      };
      mockedOpenAI.generateLinkedInPostEnhanced.mockResolvedValue(mockPostResponse);

      // Act: Generate enhanced LinkedIn post
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-report?type=linkedin`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'enhanced',
          includeProfessionalContext: true,
        })
        .expect(201);

      // Assert: Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('linkedin_enhanced');
      expect(response.body.meta.usedEnhancedTranscript).toBe(true);

      // Verify OpenAI was called correctly
      expect(mockedOpenAI.generateLinkedInPostEnhanced).toHaveBeenCalledWith(
        expect.any(String), // original transcript
        expect.stringContaining('Professional insight'), // enhanced transcript
        'Test Video for AI Integration',
        '', // summaryText
        expect.objectContaining({
          useEnhanced: true,
          includeProfessionalContext: true,
        })
      );
    });
  });

  describe('Enhanced Transcript Retrieval', () => {
    it('should retrieve enhanced transcript with proper formatting', async () => {
      // Setup: Add multiple additional text entries
      await storage.createAdditionalText({
        id: 'test-format-1',
        videoId: testVideoId,
        content: 'Context at 30 seconds.',
        label: 'Context',
        timestamp: 30,
      });

      await storage.createAdditionalText({
        id: 'test-format-2',
        videoId: testVideoId,
        content: 'Correction at 60 seconds.',
        label: 'Correction',
        timestamp: 60,
      });

      await storage.createAdditionalText({
        id: 'test-format-3',
        videoId: testVideoId,
        content: 'General note without timestamp.',
        label: 'Note',
      });

      // Act: Retrieve enhanced transcript
      const response = await request(app)
        .get(`/api/videos/${testVideoId}/enhanced-transcript`)
        .set('Cookie', authCookie)
        .expect(200);

      // Assert: Verify structure and content
      expect(response.body.success).toBe(true);
      expect(response.body.data.originalTranscript.rawText).toContain('original transcript content');
      expect(response.body.data.enhancementCount).toBe(3);
      expect(response.body.data.mergedText).toContain('--- Additional Context & Insights ---');
      expect(response.body.data.mergedText).toContain('[Context] (0:30) Context at 30 seconds');
      expect(response.body.data.mergedText).toContain('[Correction] (1:00) Correction at 60 seconds');
      expect(response.body.data.mergedText).toContain('--- General Notes & Corrections ---');
      expect(response.body.data.mergedText).toContain('[Note] General note without timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI failures gracefully', async () => {
      // Setup: Add additional text
      await storage.createAdditionalText({
        id: 'test-error-handling',
        videoId: testVideoId,
        content: 'Additional text for error test.',
        label: 'Context',
      });

      // Mock OpenAI to throw an error
      mockedOpenAI.generateVideoSummaryEnhanced.mockRejectedValue(
        new Error('OpenAI API temporarily unavailable')
      );

      // Act & Assert: Should handle error gracefully
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-summary`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'enhanced',
        })
        .expect(500);

      expect(response.body.message).toContain('Failed to generate summary');
    });

    it('should handle missing video gracefully', async () => {
      const nonExistentVideoId = 999999;

      const response = await request(app)
        .post(`/api/videos/${nonExistentVideoId}/generate-enhanced-summary`)
        .set('Cookie', authCookie)
        .send({})
        .expect(404);

      expect(response.body.message).toBe('Video not found');
    });

    it('should validate report type parameter', async () => {
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-report?type=invalid`)
        .set('Cookie', authCookie)
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Invalid report type');
    });
  });

  describe('Auto Mode Intelligence', () => {
    it('should use enhanced transcript when sufficient additional content exists', async () => {
      // Setup: Add substantial additional content (>100 characters to trigger auto mode)
      await storage.createAdditionalText({
        id: 'test-auto-substantial',
        videoId: testVideoId,
        content: 'This is a substantial amount of additional content that provides significant value and context to the original transcript. It contains detailed insights and corrections that warrant using the enhanced transcript mode automatically.',
        label: 'Context',
      });

      mockedOpenAI.generateVideoSummaryEnhanced.mockResolvedValue({
        summary: 'Auto-enhanced summary',
        keyTopics: ['Auto Mode'],
      });

      // Act: Use auto mode
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-summary`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'auto',
        })
        .expect(201);

      // Assert: Should automatically use enhanced transcript
      expect(response.body.meta.usedEnhancedTranscript).toBe(true);
    });

    it('should use original transcript when minimal additional content exists', async () => {
      // Setup: Add minimal additional content (<100 characters)
      await storage.createAdditionalText({
        id: 'test-auto-minimal',
        videoId: testVideoId,
        content: 'Short note.',
        label: 'Note',
      });

      mockedOpenAI.generateVideoSummaryEnhanced.mockResolvedValue({
        summary: 'Original transcript summary',
        keyTopics: ['Original'],
      });

      // Act: Use auto mode
      const response = await request(app)
        .post(`/api/videos/${testVideoId}/generate-enhanced-summary`)
        .set('Cookie', authCookie)
        .send({
          transcriptPreference: 'auto',
        })
        .expect(201);

      // Assert: Should use original transcript due to minimal additional content
      expect(response.body.meta.usedEnhancedTranscript).toBe(false);
    });
  });
});