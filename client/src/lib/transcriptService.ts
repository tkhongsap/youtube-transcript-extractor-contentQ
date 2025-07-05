/**
 * Transcript Service
 * Handles saving, loading, and managing additional text entries for transcripts
 */

import type { 
  AdditionalTextEntry, 
  AdditionalTextCollection, 
  CreateAdditionalTextInput,
  UpdateAdditionalTextInput,
  EnhancedTranscript,
  OriginalTranscript,
  TranscriptMergeOptions,
  MergedTranscriptResult 
} from '@/types/transcript';
import { createAdditionalTextSchema, updateAdditionalTextSchema, transcriptMergeOptionsSchema } from '@/types/transcript';

// Base API URL
const API_BASE = '/api';

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Error class for transcript service operations
 */
export class TranscriptServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'TranscriptServiceError';
  }
}

/**
 * Transcript Service class
 */
export class TranscriptService {
  /**
   * Save additional text for a transcript
   */
  static async saveAdditionalText(
    videoId: number, 
    data: CreateAdditionalTextInput
  ): Promise<AdditionalTextEntry> {
    // Validate input
    const validatedData = createAdditionalTextSchema.parse(data);
    
    try {
      const response = await fetch(`${API_BASE}/videos/${videoId}/additional-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TranscriptServiceError(
          errorData.message || 'Failed to save additional text',
          response.status,
          errorData.code
        );
      }

      const result: ApiResponse<AdditionalTextEntry> = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof TranscriptServiceError) {
        throw error;
      }
      throw new TranscriptServiceError(
        'Network error while saving additional text',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Update existing additional text
   */
  static async updateAdditionalText(
    videoId: number,
    entryId: string,
    data: UpdateAdditionalTextInput
  ): Promise<AdditionalTextEntry> {
    // Validate input
    const validatedData = updateAdditionalTextSchema.parse(data);
    
    try {
      const response = await fetch(`${API_BASE}/videos/${videoId}/additional-text/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TranscriptServiceError(
          errorData.message || 'Failed to update additional text',
          response.status,
          errorData.code
        );
      }

      const result: ApiResponse<AdditionalTextEntry> = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof TranscriptServiceError) {
        throw error;
      }
      throw new TranscriptServiceError(
        'Network error while updating additional text',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Delete additional text entry
   */
  static async deleteAdditionalText(
    videoId: number,
    entryId: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/videos/${videoId}/additional-text/${entryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TranscriptServiceError(
          errorData.message || 'Failed to delete additional text',
          response.status,
          errorData.code
        );
      }
    } catch (error) {
      if (error instanceof TranscriptServiceError) {
        throw error;
      }
      throw new TranscriptServiceError(
        'Network error while deleting additional text',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Get all additional text entries for a transcript
   */
  static async getAdditionalTextCollection(
    videoId: number
  ): Promise<AdditionalTextCollection> {
    try {
      const response = await fetch(`${API_BASE}/videos/${videoId}/additional-text`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TranscriptServiceError(
          errorData.message || 'Failed to load additional text',
          response.status,
          errorData.code
        );
      }

      const result: ApiResponse<AdditionalTextCollection> = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof TranscriptServiceError) {
        throw error;
      }
      throw new TranscriptServiceError(
        'Network error while loading additional text',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Get enhanced transcript with merged original and additional text
   */
  static async getEnhancedTranscript(
    videoId: number,
    options?: TranscriptMergeOptions
  ): Promise<EnhancedTranscript> {
    // Validate options if provided
    const validatedOptions = options ? transcriptMergeOptionsSchema.parse(options) : undefined;
    
    try {
      const url = new URL(`${API_BASE}/videos/${videoId}/enhanced-transcript`, window.location.origin);
      if (validatedOptions) {
        Object.entries(validatedOptions).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TranscriptServiceError(
          errorData.message || 'Failed to load enhanced transcript',
          response.status,
          errorData.code
        );
      }

      const result: ApiResponse<EnhancedTranscript> = await response.json();
      return result.data;
    } catch (error) {
      if (error instanceof TranscriptServiceError) {
        throw error;
      }
      throw new TranscriptServiceError(
        'Network error while loading enhanced transcript',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Merge original transcript with additional text locally
   */
  static mergeTranscriptWithAdditionalText(
    originalTranscript: OriginalTranscript,
    additionalTextCollection: AdditionalTextCollection,
    options: TranscriptMergeOptions = {
      includeTimestamps: false,
      includeLabels: true,
      separateAdditionalText: true,
      additionalTextPrefix: '[Additional Notes]: ',
      format: 'plain'
    }
  ): MergedTranscriptResult {
    const validatedOptions = transcriptMergeOptionsSchema.parse(options);
    
    let mergedText = originalTranscript.rawText;
    let wordCount = originalTranscript.rawText.split(/\s+/).length;
    const enhancementCount = additionalTextCollection.entries.length;

    if (enhancementCount > 0) {
      const additionalTexts = additionalTextCollection.entries
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .map(entry => {
          let text = '';
          
          if (validatedOptions.separateAdditionalText) {
            text += '\n\n';
            if (validatedOptions.includeLabels) {
              text += `[${entry.label}]`;
              if (validatedOptions.includeTimestamps && entry.timestamp) {
                text += ` (${formatTime(entry.timestamp)})`;
              }
              text += ': ';
            } else if (validatedOptions.additionalTextPrefix) {
              text += validatedOptions.additionalTextPrefix;
            }
          }
          
          text += entry.content;
          return text;
        })
        .join('');

      mergedText += additionalTexts;
      wordCount += additionalTexts.split(/\s+/).length;
    }

    return {
      text: mergedText,
      format: validatedOptions.format,
      wordCount,
      enhancementCount,
    };
  }

  /**
   * Auto-save functionality with debouncing
   */
  static createAutoSaver(
    videoId: number,
    onSave: (data: CreateAdditionalTextInput) => Promise<void>,
    debounceMs: number = 2000
  ) {
    let timeoutId: NodeJS.Timeout | null = null;
    let isActive = true;

    const autoSave = (data: CreateAdditionalTextInput) => {
      if (!isActive) return;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        if (isActive && data.content.trim().length > 0) {
          try {
            await onSave(data);
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      }, debounceMs);
    };

    const cleanup = () => {
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return { autoSave, cleanup };
  }
}

/**
 * Helper function to format time
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Export default instance
export default TranscriptService;