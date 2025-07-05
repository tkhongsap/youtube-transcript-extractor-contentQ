import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storage } from '../storage';
import * as openai from '../openai';
import { 
  getEnhancedTranscript, 
  shouldUseEnhancedTranscript, 
  getTranscriptForAI 
} from '../transcriptEnhancement';

// Mock OpenAI module
vi.mock('../openai');
const mockedOpenAI = vi.mocked(openai);

describe('Transcript Enhancement Integration Tests', () => {
  let testVideoId: number;

  beforeEach(async () => {
    // Create a test video
    const video = await storage.createVideo({
      userId: 'test-user-integration',
      youtubeId: 'test-video-integration',
      title: 'Test Video for Integration',
      transcript: 'This is the original transcript content for testing integration.',
      channelTitle: 'Test Channel',
      description: 'Test description',
      duration: '5:00',
    });
    testVideoId = video.id;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (testVideoId) {
      await storage.deleteVideo(testVideoId);
    }
  });

  describe('Enhanced Transcript Generation', () => {
    it('should create enhanced transcript with additional text', async () => {
      // Add additional text entries
      await storage.createAdditionalText({
        id: 'test-1',
        videoId: testVideoId,
        content: 'Important context about the video.',
        label: 'Context',
        timestamp: 30,
      });

      await storage.createAdditionalText({
        id: 'test-2',
        videoId: testVideoId,
        content: 'Correction to the original content.',
        label: 'Correction',
        timestamp: 60,
      });

      // Get enhanced transcript
      const result = await getEnhancedTranscript(testVideoId);

      expect(result).toBeTruthy();
      expect(result!.hasEnhancements).toBe(true);
      expect(result!.enhancementCount).toBe(2);
      expect(result!.enhancedTranscript).toContain('Important context about the video');
      expect(result!.enhancedTranscript).toContain('Correction to the original content');
      expect(result!.enhancedTranscript).toContain('--- Additional Context & Insights ---');
    });

    it('should handle video with no additional text', async () => {
      const result = await getEnhancedTranscript(testVideoId);

      expect(result).toBeTruthy();
      expect(result!.hasEnhancements).toBe(false);
      expect(result!.enhancementCount).toBe(0);
      expect(result!.enhancedTranscript).toBe(result!.originalTranscript);
    });

    it('should format timestamps correctly', async () => {
      await storage.createAdditionalText({
        id: 'test-timestamp',
        videoId: testVideoId,
        content: 'Text at 90 seconds.',
        label: 'Context',
        timestamp: 90,
      });

      const result = await getEnhancedTranscript(testVideoId);

      expect(result!.enhancedTranscript).toContain('(1:30)');
    });
  });

  describe('Auto-Detection Logic', () => {
    it('should recommend enhanced transcript for substantial additional content', async () => {
      // Add substantial additional content (>100 characters)
      await storage.createAdditionalText({
        id: 'substantial',
        videoId: testVideoId,
        content: 'This is a substantial amount of additional content that provides significant value and context to the original transcript.',
        label: 'Context',
      });

      const shouldUse = await shouldUseEnhancedTranscript(testVideoId, 'auto');
      expect(shouldUse).toBe(true);
    });

    it('should recommend original transcript for minimal additional content', async () => {
      // Add minimal additional content (<100 characters)
      await storage.createAdditionalText({
        id: 'minimal',
        videoId: testVideoId,
        content: 'Short note.',
        label: 'Note',
      });

      const shouldUse = await shouldUseEnhancedTranscript(testVideoId, 'auto');
      expect(shouldUse).toBe(false);
    });

    it('should respect user preference overrides', async () => {
      // Add substantial content
      await storage.createAdditionalText({
        id: 'preference-test',
        videoId: testVideoId,
        content: 'Substantial additional content that would normally trigger enhanced mode.',
        label: 'Context',
      });

      // Test forced original
      const forceOriginal = await shouldUseEnhancedTranscript(testVideoId, 'original');
      expect(forceOriginal).toBe(false);

      // Test forced enhanced
      const forceEnhanced = await shouldUseEnhancedTranscript(testVideoId, 'enhanced');
      expect(forceEnhanced).toBe(true);
    });
  });

  describe('AI Processing Integration', () => {
    it('should select appropriate transcript for AI processing', async () => {
      // Add substantial additional content
      await storage.createAdditionalText({
        id: 'ai-test',
        videoId: testVideoId,
        content: 'Professional insight that adds significant business value and context for enhanced AI processing.',
        label: 'Insight',
      });

      // Test auto mode
      const { transcript, isEnhanced } = await getTranscriptForAI(testVideoId, 'auto');
      
      expect(isEnhanced).toBe(true);
      expect(transcript).toContain('Professional insight that adds significant business value');
      expect(transcript).toContain('--- Additional Context & Insights ---');
    });

    it('should handle enhanced AI generation functions', async () => {
      // Setup enhanced transcript
      await storage.createAdditionalText({
        id: 'ai-enhanced',
        videoId: testVideoId,
        content: 'Additional professional context.',
        label: 'Context',
      });

      const originalTranscript = 'This is the original transcript content for testing integration.';
      const enhancedTranscript = `${originalTranscript}\n\n--- Additional Context & Insights ---\n[Context] Additional professional context.`;

      // Mock OpenAI enhanced summary
      mockedOpenAI.generateVideoSummaryEnhanced.mockResolvedValue({
        summary: 'Enhanced summary incorporating additional context.',
        keyTopics: ['Original Content', 'Additional Context'],
      });

      // Test enhanced summary generation
      const result = await openai.generateVideoSummaryEnhanced(
        originalTranscript,
        enhancedTranscript,
        'Test Video',
        { useEnhanced: true, includeProfessionalContext: true }
      );

      expect(result.summary).toBe('Enhanced summary incorporating additional context.');
      expect(result.keyTopics).toContain('Additional Context');
      expect(mockedOpenAI.generateVideoSummaryEnhanced).toHaveBeenCalledWith(
        originalTranscript,
        enhancedTranscript,
        'Test Video',
        expect.objectContaining({ useEnhanced: true })
      );
    });

    it('should handle AI processing errors gracefully', async () => {
      // Mock OpenAI to throw an error
      mockedOpenAI.generateVideoSummaryEnhanced.mockRejectedValue(
        new Error('OpenAI API temporarily unavailable')
      );

      await expect(
        openai.generateVideoSummaryEnhanced(
          'Test transcript',
          undefined,
          'Test Video'
        )
      ).rejects.toThrow('Failed to generate summary from transcript');
    });
  });

  describe('Data Persistence', () => {
    it('should persist and retrieve additional text correctly', async () => {
      // Create additional text
      const created = await storage.createAdditionalText({
        id: 'persistence-test',
        videoId: testVideoId,
        content: 'Test persistence content.',
        label: 'Context',
        timestamp: 45,
        position: 'inline',
        segmentId: 'segment-1',
      });

      expect(created.id).toBe('persistence-test');
      expect(created.content).toBe('Test persistence content.');
      expect(created.label).toBe('Context');
      expect(created.timestamp).toBe(45);
      expect(created.position).toBe('inline');
      expect(created.segmentId).toBe('segment-1');

      // Retrieve by video ID
      const retrieved = await storage.getAdditionalTextByVideoId(testVideoId);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('persistence-test');

      // Update additional text
      const updated = await storage.updateAdditionalText(testVideoId, 'persistence-test', {
        content: 'Updated content.',
        label: 'Correction',
      });

      expect(updated!.content).toBe('Updated content.');
      expect(updated!.label).toBe('Correction');
      expect(updated!.timestamp).toBe(45); // Should remain unchanged

      // Delete additional text
      const deleted = await storage.deleteAdditionalText(testVideoId, 'persistence-test');
      expect(deleted).toBe(true);

      // Verify deletion
      const afterDeletion = await storage.getAdditionalTextByVideoId(testVideoId);
      expect(afterDeletion).toHaveLength(0);
    });

    it('should handle concurrent operations correctly', async () => {
      // Create multiple additional text entries concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        storage.createAdditionalText({
          id: `concurrent-${i}`,
          videoId: testVideoId,
          content: `Concurrent content ${i}`,
          label: 'Context',
          timestamp: i * 10,
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);

      // Verify all were created
      const allEntries = await storage.getAdditionalTextByVideoId(testVideoId);
      expect(allEntries).toHaveLength(5);

      // Verify ordering by timestamp
      expect(allEntries[0].timestamp).toBe(0);
      expect(allEntries[4].timestamp).toBe(40);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent video gracefully', async () => {
      const result = await getEnhancedTranscript(999999);
      expect(result).toBeNull();
    });

    it('should handle empty additional text content', async () => {
      // This should be prevented at the validation layer
      await expect(
        storage.createAdditionalText({
          id: 'empty-test',
          videoId: testVideoId,
          content: '',
          label: 'Context',
        })
      ).rejects.toThrow();
    });

    it('should handle very long additional text', async () => {
      const longContent = 'A'.repeat(10000); // 10KB of content
      
      const created = await storage.createAdditionalText({
        id: 'long-content',
        videoId: testVideoId,
        content: longContent,
        label: 'Context',
      });

      expect(created.content).toHaveLength(10000);

      const enhancedTranscript = await getEnhancedTranscript(testVideoId);
      expect(enhancedTranscript!.enhancedTranscript).toContain(longContent);
    });

    it('should handle special characters and unicode', async () => {
      const specialContent = 'Special chars: émojis 🚀 quotes "smart" and symbols ®™';
      
      const created = await storage.createAdditionalText({
        id: 'special-chars',
        videoId: testVideoId,
        content: specialContent,
        label: 'Context',
      });

      expect(created.content).toBe(specialContent);

      const enhancedTranscript = await getEnhancedTranscript(testVideoId);
      expect(enhancedTranscript!.enhancedTranscript).toContain(specialContent);
    });

    it('should handle deletion of video with additional text', async () => {
      // Add additional text
      await storage.createAdditionalText({
        id: 'deletion-test',
        videoId: testVideoId,
        content: 'Content to be deleted with video.',
        label: 'Context',
      });

      // Verify additional text exists
      const beforeDeletion = await storage.getAdditionalTextByVideoId(testVideoId);
      expect(beforeDeletion).toHaveLength(1);

      // Delete video (should cascade delete additional text)
      await storage.deleteVideo(testVideoId);

      // Verify additional text was also deleted
      const afterDeletion = await storage.getAdditionalTextByVideoId(testVideoId);
      expect(afterDeletion).toHaveLength(0);

      // Mark video as deleted to prevent cleanup issues
      testVideoId = 0;
    });
  });
});