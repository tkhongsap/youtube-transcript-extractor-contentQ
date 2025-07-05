import { describe, it, expect } from 'vitest';
import {
  additionalTextEntrySchema,
  createAdditionalTextSchema,
  updateAdditionalTextSchema,
  transcriptMergeOptionsSchema,
  ADDITIONAL_TEXT_LABELS,
  type OriginalTranscript,
  type AdditionalTextEntry,
  type EnhancedTranscript,
} from './transcript';

describe('Transcript Type Definitions and Validation', () => {
  describe('Additional Text Entry Schema', () => {
    it('should validate a valid additional text entry', () => {
      const validEntry = {
        content: 'This is additional context about the topic discussed.',
        timestamp: 120.5,
        label: 'Context',
        position: 'after',
        segmentId: 'segment-1',
      };

      const result = additionalTextEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validEntry);
      }
    });

    it('should reject empty content', () => {
      const invalidEntry = {
        content: '',
        label: 'Context',
      };

      const result = additionalTextEntrySchema.safeParse(invalidEntry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Content cannot be empty');
      }
    });

    it('should reject content exceeding 5000 characters', () => {
      const invalidEntry = {
        content: 'a'.repeat(5001),
        label: 'Context',
      };

      const result = additionalTextEntrySchema.safeParse(invalidEntry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Content cannot exceed 5000 characters');
      }
    });

    it('should reject negative timestamps', () => {
      const invalidEntry = {
        content: 'Valid content',
        timestamp: -10,
        label: 'Context',
      };

      const result = additionalTextEntrySchema.safeParse(invalidEntry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Timestamp must be positive');
      }
    });

    it('should reject invalid labels', () => {
      const invalidEntry = {
        content: 'Valid content',
        label: 'InvalidLabel',
      };

      const result = additionalTextEntrySchema.safeParse(invalidEntry);
      expect(result.success).toBe(false);
    });

    it('should accept all valid labels', () => {
      ADDITIONAL_TEXT_LABELS.forEach(label => {
        const entry = {
          content: 'Valid content',
          label,
        };

        const result = additionalTextEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      });
    });

    it('should make timestamp, position, and segmentId optional', () => {
      const minimalEntry = {
        content: 'Valid content',
        label: 'Context',
      };

      const result = additionalTextEntrySchema.safeParse(minimalEntry);
      expect(result.success).toBe(true);
    });
  });

  describe('Update Additional Text Schema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        content: 'Updated content',
      };

      const result = updateAdditionalTextSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object for no updates', () => {
      const noUpdate = {};

      const result = updateAdditionalTextSchema.safeParse(noUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('Transcript Merge Options Schema', () => {
    it('should provide default values', () => {
      const emptyOptions = {};

      const result = transcriptMergeOptionsSchema.safeParse(emptyOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          includeTimestamps: false,
          includeLabels: true,
          separateAdditionalText: true,
          additionalTextPrefix: '[Additional Notes]: ',
          format: 'plain',
        });
      }
    });

    it('should accept custom options', () => {
      const customOptions = {
        includeTimestamps: true,
        includeLabels: false,
        separateAdditionalText: false,
        additionalTextPrefix: '>>> ',
        format: 'markdown',
      };

      const result = transcriptMergeOptionsSchema.safeParse(customOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(customOptions);
      }
    });

    it('should reject invalid format', () => {
      const invalidOptions = {
        format: 'invalid',
      };

      const result = transcriptMergeOptionsSchema.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });
  });

  describe('Type Definitions', () => {
    it('should correctly type OriginalTranscript', () => {
      const transcript: OriginalTranscript = {
        videoId: 1,
        rawText: 'This is the transcript text',
        source: 'youtube',
        generatedAt: new Date(),
        segments: [
          {
            id: 'seg-1',
            text: 'First segment',
            startTime: 0,
            endTime: 10,
            speaker: 'Speaker 1',
          },
        ],
        language: 'en',
        duration: 300,
      };

      expect(transcript.videoId).toBe(1);
      expect(transcript.source).toBe('youtube');
    });

    it('should correctly type AdditionalTextEntry', () => {
      const entry: AdditionalTextEntry = {
        id: 'entry-1',
        content: 'Additional information',
        timestamp: 45,
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
        position: 'after',
        segmentId: 'seg-1',
      };

      expect(entry.id).toBe('entry-1');
      expect(entry.label).toBe('Context');
    });

    it('should correctly type EnhancedTranscript', () => {
      const enhanced: EnhancedTranscript = {
        videoId: 1,
        original: {
          videoId: 1,
          rawText: 'Original text',
          source: 'youtube',
          generatedAt: new Date(),
        },
        additionalTextCollection: {
          videoId: 1,
          entries: [],
          totalCharacters: 0,
          lastModified: new Date(),
        },
        enhancementMetadata: {
          totalEnhancements: 0,
          lastEnhancedAt: new Date(),
          enhancedBy: 'user-1',
          version: 1,
        },
      };

      expect(enhanced.videoId).toBe(1);
      expect(enhanced.enhancementMetadata.version).toBe(1);
    });
  });
});