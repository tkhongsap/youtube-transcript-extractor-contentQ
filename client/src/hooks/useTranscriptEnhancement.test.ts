import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTranscriptEnhancement } from './useTranscriptEnhancement';
import { TranscriptService, TranscriptServiceError } from '@/lib/transcriptService';
import type { 
  AdditionalTextCollection, 
  AdditionalTextEntry, 
  CreateAdditionalTextInput 
} from '@/types/transcript';

// Mock the TranscriptService
vi.mock('@/lib/transcriptService', () => ({
  TranscriptService: {
    getAdditionalTextCollection: vi.fn(),
    getEnhancedTranscript: vi.fn(),
    saveAdditionalText: vi.fn(),
    updateAdditionalText: vi.fn(),
    deleteAdditionalText: vi.fn(),
  },
  TranscriptServiceError: class extends Error {
    constructor(message: string, public statusCode?: number, public code?: string) {
      super(message);
      this.name = 'TranscriptServiceError';
    }
  },
}));

const mockedTranscriptService = vi.mocked(TranscriptService);

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useTranscriptEnhancement', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockAdditionalTextCollection: AdditionalTextCollection = {
    videoId: 1,
    entries: [
      {
        id: 'entry-1',
        content: 'Test additional text',
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    totalCharacters: 19,
    lastModified: new Date(),
  };

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1 }),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.saveError).toBe(null);
      expect(result.current.deleteError).toBe(null);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.pendingAutoSave).toBe(null);
    });

    it('should load additional text collection on mount', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedTranscriptService.getAdditionalTextCollection).toHaveBeenCalledWith(1);
      expect(result.current.additionalTextCollection).toEqual(mockAdditionalTextCollection);
    });
  });

  describe('Save Functionality', () => {
    it('should save additional text successfully', async () => {
      const newEntry: AdditionalTextEntry = {
        id: 'entry-2',
        content: 'New additional text',
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.saveAdditionalText.mockResolvedValue(newEntry);

      const onSaveSuccess = vi.fn();
      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1, onSaveSuccess }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const saveData: CreateAdditionalTextInput = {
        content: 'New additional text',
        label: 'Context',
      };

      await act(async () => {
        const savedEntry = await result.current.saveAdditionalText(saveData);
        expect(savedEntry).toEqual(newEntry);
      });

      expect(mockedTranscriptService.saveAdditionalText).toHaveBeenCalledWith(1, saveData);
      expect(onSaveSuccess).toHaveBeenCalledWith(newEntry);
      expect(result.current.saveError).toBe(null);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should handle save errors', async () => {
      const error = new TranscriptServiceError('Save failed', 400, 'VALIDATION_ERROR');
      
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.saveAdditionalText.mockRejectedValue(error);

      const onSaveError = vi.fn();
      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1, onSaveError }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const saveData: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      await act(async () => {
        await expect(result.current.saveAdditionalText(saveData)).rejects.toThrow(error);
      });

      expect(onSaveError).toHaveBeenCalledWith(error);
      expect(result.current.saveError).toEqual(error);
    });

    it('should show loading state during save', async () => {
      let resolveSave: (value: AdditionalTextEntry) => void;
      const savePromise = new Promise<AdditionalTextEntry>((resolve) => {
        resolveSave = resolve;
      });

      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.saveAdditionalText.mockReturnValue(savePromise);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const saveData: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      // Start save operation
      act(() => {
        result.current.saveAdditionalText(saveData);
      });

      // Should show loading state
      expect(result.current.isSaving).toBe(true);

      // Complete save operation
      const newEntry: AdditionalTextEntry = {
        id: 'entry-2',
        content: 'Test content',
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        resolveSave!(newEntry);
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });
  });

  describe('Auto-Save Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-save after delay', async () => {
      const newEntry: AdditionalTextEntry = {
        id: 'entry-2',
        content: 'Auto-saved text',
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.saveAdditionalText.mockResolvedValue(newEntry);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1, autoSaveDelay: 1000 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const saveData: CreateAdditionalTextInput = {
        content: 'Auto-saved text',
        label: 'Context',
      };

      act(() => {
        result.current.autoSaveAdditionalText(saveData);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
      expect(result.current.pendingAutoSave).toEqual(saveData);

      // Fast-forward time to trigger auto-save
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockedTranscriptService.saveAdditionalText).toHaveBeenCalledWith(1, saveData);
      });
    });

    it('should debounce auto-save calls', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.saveAdditionalText.mockResolvedValue({} as AdditionalTextEntry);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1, autoSaveDelay: 1000 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const saveData: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      // Call auto-save multiple times quickly
      act(() => {
        result.current.autoSaveAdditionalText(saveData);
        result.current.autoSaveAdditionalText(saveData);
        result.current.autoSaveAdditionalText(saveData);
      });

      // Fast-forward time to trigger auto-save
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockedTranscriptService.saveAdditionalText).toHaveBeenCalledTimes(1);
      });
    });

    it('should not auto-save when disabled', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1, enableAutoSave: false }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const saveData: CreateAdditionalTextInput = {
        content: 'Test content',
        label: 'Context',
      };

      act(() => {
        result.current.autoSaveAdditionalText(saveData);
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.pendingAutoSave).toBe(null);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockedTranscriptService.saveAdditionalText).not.toHaveBeenCalled();
    });
  });

  describe('Delete Functionality', () => {
    it('should delete additional text successfully', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.deleteAdditionalText.mockResolvedValue(undefined);

      const onDeleteSuccess = vi.fn();
      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1, onDeleteSuccess }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteAdditionalText('entry-1');
      });

      expect(mockedTranscriptService.deleteAdditionalText).toHaveBeenCalledWith(1, 'entry-1');
      expect(onDeleteSuccess).toHaveBeenCalled();
      expect(result.current.deleteError).toBe(null);
    });

    it('should handle delete errors', async () => {
      const error = new TranscriptServiceError('Delete failed', 404, 'NOT_FOUND');
      
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.deleteAdditionalText.mockRejectedValue(error);

      const onDeleteError = vi.fn();
      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1, onDeleteError }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.deleteAdditionalText('entry-1')).rejects.toThrow(error);
      });

      expect(onDeleteError).toHaveBeenCalledWith(error);
      expect(result.current.deleteError).toEqual(error);
    });
  });

  describe('Update Functionality', () => {
    it('should update additional text successfully', async () => {
      const updatedEntry: AdditionalTextEntry = {
        id: 'entry-1',
        content: 'Updated content',
        label: 'Correction',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.updateAdditionalText.mockResolvedValue(updatedEntry);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updateData = {
        content: 'Updated content',
        label: 'Correction' as const,
      };

      await act(async () => {
        const result_entry = await result.current.updateAdditionalText('entry-1', updateData);
        expect(result_entry).toEqual(updatedEntry);
      });

      expect(mockedTranscriptService.updateAdditionalText).toHaveBeenCalledWith(1, 'entry-1', updateData);
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors', async () => {
      const error = new TranscriptServiceError('Load failed', 500, 'SERVER_ERROR');
      
      mockedTranscriptService.getAdditionalTextCollection.mockRejectedValue(error);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.additionalTextCollection).toBeUndefined();
    });

    it('should not retry on 404 errors', async () => {
      const error = new TranscriptServiceError('Not found', 404, 'NOT_FOUND');
      
      mockedTranscriptService.getAdditionalTextCollection.mockRejectedValue(error);

      renderHook(
        () => useTranscriptEnhancement({ videoId: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(mockedTranscriptService.getAdditionalTextCollection).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Refetch Functionality', () => {
    it('should refetch data when refetch is called', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.getEnhancedTranscript.mockResolvedValue({} as any);

      const { result } = renderHook(
        () => useTranscriptEnhancement({ videoId: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear previous calls
      vi.clearAllMocks();

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockedTranscriptService.getAdditionalTextCollection).toHaveBeenCalledWith(1);
      expect(mockedTranscriptService.getEnhancedTranscript).toHaveBeenCalledWith(1);
    });
  });
});