/**
 * Custom hook for managing transcript enhancement functionality
 * Integrates with transcript service for data persistence and auto-save
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TranscriptService, TranscriptServiceError } from '@/lib/transcriptService';
import type { 
  OriginalTranscript,
  AdditionalTextCollection,
  AdditionalTextEntry,
  CreateAdditionalTextInput,
  UpdateAdditionalTextInput,
  EnhancedTranscript 
} from '@/types/transcript';

export interface UseTranscriptEnhancementOptions {
  videoId: number;
  enableAutoSave?: boolean;
  autoSaveDelay?: number;
  onSaveSuccess?: (entry: AdditionalTextEntry) => void;
  onSaveError?: (error: TranscriptServiceError) => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: TranscriptServiceError) => void;
}

export interface UseTranscriptEnhancementReturn {
  // Data
  additionalTextCollection: AdditionalTextCollection | undefined;
  enhancedTranscript: EnhancedTranscript | undefined;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  
  // Error states
  error: TranscriptServiceError | null;
  saveError: TranscriptServiceError | null;
  deleteError: TranscriptServiceError | null;
  
  // Actions
  saveAdditionalText: (data: CreateAdditionalTextInput) => Promise<AdditionalTextEntry>;
  updateAdditionalText: (entryId: string, data: UpdateAdditionalTextInput) => Promise<AdditionalTextEntry>;
  deleteAdditionalText: (entryId: string) => Promise<void>;
  autoSaveAdditionalText: (data: CreateAdditionalTextInput) => void;
  
  // Utilities
  refetch: () => Promise<void>;
  hasUnsavedChanges: boolean;
  pendingAutoSave: CreateAdditionalTextInput | null;
}

export function useTranscriptEnhancement({
  videoId,
  enableAutoSave = true,
  autoSaveDelay = 2000,
  onSaveSuccess,
  onSaveError,
  onDeleteSuccess,
  onDeleteError,
}: UseTranscriptEnhancementOptions): UseTranscriptEnhancementReturn {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<TranscriptServiceError | null>(null);
  const [deleteError, setDeleteError] = useState<TranscriptServiceError | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAutoSave, setPendingAutoSave] = useState<CreateAdditionalTextInput | null>(null);
  
  // Auto-save timeout ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Query for additional text collection
  const {
    data: additionalTextCollection,
    isLoading,
    error,
    refetch: refetchCollection,
  } = useQuery({
    queryKey: ['additionalText', videoId],
    queryFn: () => TranscriptService.getAdditionalTextCollection(videoId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof TranscriptServiceError && error.statusCode === 404) {
        return false; // Don't retry for 404s
      }
      return failureCount < 3;
    },
  });

  // Query for enhanced transcript
  const {
    data: enhancedTranscript,
    refetch: refetchEnhanced,
  } = useQuery({
    queryKey: ['enhancedTranscript', videoId],
    queryFn: () => TranscriptService.getEnhancedTranscript(videoId),
    enabled: false, // Only fetch when explicitly requested
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mutation for saving additional text
  const saveMutation = useMutation({
    mutationFn: (data: CreateAdditionalTextInput) => 
      TranscriptService.saveAdditionalText(videoId, data),
    onSuccess: async (entry) => {
      // Invalidate and refetch the cache instead of manual update
      await queryClient.invalidateQueries({
        queryKey: ['additionalText', videoId]
      });
      
      setSaveError(null);
      setHasUnsavedChanges(false);
      setPendingAutoSave(null);
      onSaveSuccess?.(entry);
    },
    onError: (error: TranscriptServiceError) => {
      setSaveError(error);
      onSaveError?.(error);
    },
  });

  // Mutation for updating additional text
  const updateMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: UpdateAdditionalTextInput }) =>
      TranscriptService.updateAdditionalText(videoId, entryId, data),
    onSuccess: async (updatedEntry) => {
      // Invalidate and refetch the cache
      await queryClient.invalidateQueries({
        queryKey: ['additionalText', videoId]
      });
      
      setSaveError(null);
      setHasUnsavedChanges(false);
    },
    onError: (error: TranscriptServiceError) => {
      setSaveError(error);
      onSaveError?.(error);
    },
  });

  // Mutation for deleting additional text
  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => 
      TranscriptService.deleteAdditionalText(videoId, entryId),
    onSuccess: async (_, entryId) => {
      // Invalidate and refetch the cache
      await queryClient.invalidateQueries({
        queryKey: ['additionalText', videoId]
      });
      
      setDeleteError(null);
      onDeleteSuccess?.();
    },
    onError: (error: TranscriptServiceError) => {
      setDeleteError(error);
      onDeleteError?.(error);
    },
  });

  // Auto-save functionality
  const autoSaveAdditionalText = useCallback((data: CreateAdditionalTextInput) => {
    if (!enableAutoSave) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set pending auto-save data
    setPendingAutoSave(data);
    setHasUnsavedChanges(true);

    // Schedule auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (data.content.trim().length > 0) {
        saveMutation.mutate(data);
      }
    }, autoSaveDelay);
  }, [enableAutoSave, autoSaveDelay, saveMutation]);

  // Manual save function
  const saveAdditionalText = useCallback(async (data: CreateAdditionalTextInput): Promise<AdditionalTextEntry> => {
    // Clear auto-save timeout if exists
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    setPendingAutoSave(null);
    return saveMutation.mutateAsync(data);
  }, [saveMutation]);

  // Update function
  const updateAdditionalText = useCallback(async (
    entryId: string, 
    data: UpdateAdditionalTextInput
  ): Promise<AdditionalTextEntry> => {
    return updateMutation.mutateAsync({ entryId, data });
  }, [updateMutation]);

  // Delete function
  const deleteAdditionalText = useCallback(async (entryId: string): Promise<void> => {
    return deleteMutation.mutateAsync(entryId);
  }, [deleteMutation]);

  // Refetch function
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchCollection(),
      refetchEnhanced(),
    ]);
  }, [refetchCollection, refetchEnhanced]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    additionalTextCollection,
    enhancedTranscript,
    
    // Loading states
    isLoading,
    isSaving: saveMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Error states
    error: error instanceof TranscriptServiceError ? error : null,
    saveError,
    deleteError,
    
    // Actions
    saveAdditionalText,
    updateAdditionalText,
    deleteAdditionalText,
    autoSaveAdditionalText,
    
    // Utilities
    refetch,
    hasUnsavedChanges,
    pendingAutoSave,
  };
}