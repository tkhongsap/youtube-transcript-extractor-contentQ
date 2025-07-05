import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranscriptService, TranscriptServiceError } from './transcriptService';
import type { 
  CreateAdditionalTextInput, 
  UpdateAdditionalTextInput, 
  AdditionalTextEntry,
  AdditionalTextCollection,
  OriginalTranscript 
} from '@/types/transcript';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TranscriptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveAdditionalText', () => {
    it('should save additional text successfully', async () => {
      const mockEntry: AdditionalTextEntry = {
        id: 'entry-1',
        content: 'Test additional text',
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: mockEntry,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const input: CreateAdditionalTextInput = {
        content: 'Test additional text',
        label: 'Context',
      };

      const result = await TranscriptService.saveAdditionalText(1, input);

      expect(mockFetch).toHaveBeenCalledWith('/api/videos/1/additional-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      expect(result).toEqual(mockEntry);
    });

    it('should handle validation errors', async () => {
      const invalidInput = {
        content: '', // Invalid: empty content
        label: 'Context',
      } as CreateAdditionalTextInput;

      await expect(
        TranscriptService.saveAdditionalText(1, invalidInput)
      ).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          message: 'Bad request',
          code: 'VALIDATION_ERROR',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const input: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      await expect(
        TranscriptService.saveAdditionalText(1, input)
      ).rejects.toThrow(TranscriptServiceError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const input: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      await expect(
        TranscriptService.saveAdditionalText(1, input)
      ).rejects.toThrow(TranscriptServiceError);
    });
  });

  describe('updateAdditionalText', () => {
    it('should update additional text successfully', async () => {
      const mockEntry: AdditionalTextEntry = {
        id: 'entry-1',
        content: 'Updated text',
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: mockEntry,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const input: UpdateAdditionalTextInput = {
        content: 'Updated text',
      };

      const result = await TranscriptService.updateAdditionalText(1, 'entry-1', input);

      expect(mockFetch).toHaveBeenCalledWith('/api/videos/1/additional-text/entry-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      expect(result).toEqual(mockEntry);
    });

    it('should handle 404 errors for non-existent entries', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          message: 'Entry not found',
          code: 'NOT_FOUND',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const input: UpdateAdditionalTextInput = {
        content: 'Updated text',
      };

      await expect(
        TranscriptService.updateAdditionalText(1, 'non-existent', input)
      ).rejects.toThrow(TranscriptServiceError);
    });
  });

  describe('deleteAdditionalText', () => {
    it('should delete additional text successfully', async () => {
      const mockResponse = {
        ok: true,
      };

      mockFetch.mockResolvedValue(mockResponse);

      await TranscriptService.deleteAdditionalText(1, 'entry-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/videos/1/additional-text/entry-1', {
        method: 'DELETE',
      });
    });

    it('should handle delete errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({
          message: 'Forbidden',
          code: 'FORBIDDEN',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        TranscriptService.deleteAdditionalText(1, 'entry-1')
      ).rejects.toThrow(TranscriptServiceError);
    });
  });

  describe('getAdditionalTextCollection', () => {
    it('should fetch additional text collection successfully', async () => {
      const mockCollection: AdditionalTextCollection = {
        videoId: 1,
        entries: [
          {
            id: 'entry-1',
            content: 'Test content',
            label: 'Context',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalCharacters: 12,
        lastModified: new Date(),
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: mockCollection,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await TranscriptService.getAdditionalTextCollection(1);

      expect(mockFetch).toHaveBeenCalledWith('/api/videos/1/additional-text');
      expect(result).toEqual(mockCollection);
    });

    it('should handle empty collections', async () => {
      const mockCollection: AdditionalTextCollection = {
        videoId: 1,
        entries: [],
        totalCharacters: 0,
        lastModified: new Date(),
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: mockCollection,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await TranscriptService.getAdditionalTextCollection(1);

      expect(result.entries).toHaveLength(0);
      expect(result.totalCharacters).toBe(0);
    });
  });

  describe('mergeTranscriptWithAdditionalText', () => {
    const mockOriginalTranscript: OriginalTranscript = {
      videoId: 1,
      rawText: 'This is the original transcript.',
      source: 'youtube',
      generatedAt: new Date(),
    };

    const mockAdditionalTextCollection: AdditionalTextCollection = {
      videoId: 1,
      entries: [
        {
          id: 'entry-1',
          content: 'This is additional context.',
          label: 'Context',
          timestamp: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'entry-2',
          content: 'This is a correction.',
          label: 'Correction',
          timestamp: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      totalCharacters: 47,
      lastModified: new Date(),
    };

    it('should merge transcript with additional text using default options', () => {
      const result = TranscriptService.mergeTranscriptWithAdditionalText(
        mockOriginalTranscript,
        mockAdditionalTextCollection
      );

      expect(result.text).toContain('This is the original transcript.');
      expect(result.text).toContain('This is additional context.');
      expect(result.text).toContain('This is a correction.');
      expect(result.enhancementCount).toBe(2);
      expect(result.format).toBe('plain');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should merge with timestamps when includeTimestamps is true', () => {
      const result = TranscriptService.mergeTranscriptWithAdditionalText(
        mockOriginalTranscript,
        mockAdditionalTextCollection,
        {
          includeTimestamps: true,
          includeLabels: true,
          separateAdditionalText: true,
          format: 'plain',
        }
      );

      expect(result.text).toContain('(0:30)');
      expect(result.text).toContain('(1:00)');
    });

    it('should handle empty additional text collection', () => {
      const emptyCollection: AdditionalTextCollection = {
        videoId: 1,
        entries: [],
        totalCharacters: 0,
        lastModified: new Date(),
      };

      const result = TranscriptService.mergeTranscriptWithAdditionalText(
        mockOriginalTranscript,
        emptyCollection
      );

      expect(result.text).toBe(mockOriginalTranscript.rawText);
      expect(result.enhancementCount).toBe(0);
    });

    it('should sort additional text by timestamp', () => {
      const unsortedCollection: AdditionalTextCollection = {
        ...mockAdditionalTextCollection,
        entries: [
          {
            id: 'entry-2',
            content: 'Second entry (timestamp 60)',
            label: 'Context',
            timestamp: 60,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'entry-1',
            content: 'First entry (timestamp 30)',
            label: 'Context',
            timestamp: 30,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const result = TranscriptService.mergeTranscriptWithAdditionalText(
        mockOriginalTranscript,
        unsortedCollection
      );

      const firstIndex = result.text.indexOf('First entry');
      const secondIndex = result.text.indexOf('Second entry');
      expect(firstIndex).toBeLessThan(secondIndex);
    });
  });

  describe('createAutoSaver', () => {
    it('should create auto-saver with debouncing', async () => {
      vi.useFakeTimers();
      
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { autoSave, cleanup } = TranscriptService.createAutoSaver(1, onSave, 1000);

      const data: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      // Call autoSave multiple times quickly
      autoSave(data);
      autoSave(data);
      autoSave(data);

      // Fast-forward time but not enough to trigger save
      vi.advanceTimersByTime(500);
      expect(onSave).not.toHaveBeenCalled();

      // Fast-forward to trigger save
      vi.advanceTimersByTime(600);
      await vi.runAllTimersAsync();

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(data);

      cleanup();
      vi.useRealTimers();
    });

    it('should not save empty content', async () => {
      vi.useFakeTimers();
      
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { autoSave, cleanup } = TranscriptService.createAutoSaver(1, onSave, 1000);

      const data: CreateAdditionalTextInput = {
        content: '   ', // Only whitespace
        label: 'Context',
      };

      autoSave(data);
      vi.advanceTimersByTime(1100);
      await vi.runAllTimersAsync();

      expect(onSave).not.toHaveBeenCalled();

      cleanup();
      vi.useRealTimers();
    });

    it('should handle save errors gracefully', async () => {
      vi.useFakeTimers();
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { autoSave, cleanup } = TranscriptService.createAutoSaver(1, onSave, 1000);

      const data: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      autoSave(data);
      vi.advanceTimersByTime(1100);
      await vi.runAllTimersAsync();

      expect(onSave).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Auto-save failed:', expect.any(Error));

      cleanup();
      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should cleanup properly', () => {
      vi.useFakeTimers();
      
      const onSave = vi.fn();
      const { autoSave, cleanup } = TranscriptService.createAutoSaver(1, onSave, 1000);

      const data: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      autoSave(data);
      cleanup();

      // Auto-save should not trigger after cleanup
      vi.advanceTimersByTime(1100);
      expect(onSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('TranscriptServiceError', () => {
    it('should create error with message', () => {
      const error = new TranscriptServiceError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TranscriptServiceError');
      expect(error.statusCode).toBeUndefined();
      expect(error.code).toBeUndefined();
    });

    it('should create error with status code and error code', () => {
      const error = new TranscriptServiceError('Test error', 400, 'BAD_REQUEST');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });
  });
});