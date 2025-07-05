/**
 * Type definitions for transcript enhancement feature
 */

import { z } from 'zod';

/**
 * Represents a segment of the original transcript with timing information
 */
export interface TranscriptSegment {
  id: string;
  text: string;
  startTime?: number; // in seconds
  endTime?: number; // in seconds
  speaker?: string; // optional speaker identification
}

/**
 * Original transcript data structure as it comes from the video source
 */
export interface OriginalTranscript {
  videoId: number;
  rawText: string; // The full transcript as plain text
  segments?: TranscriptSegment[]; // Optional structured segments
  language?: string; // ISO language code (e.g., 'en', 'es')
  duration?: number; // Total duration in seconds
  source: 'youtube' | 'upload' | 'manual'; // Source of the transcript
  generatedAt: Date; // When the transcript was generated
}

/**
 * Metadata about the transcript
 */
export interface TranscriptMetadata {
  wordCount: number;
  estimatedReadingTime: number; // in minutes
  hasTimestamps: boolean;
  hasSpeakerLabels: boolean;
  confidence?: number; // 0-1 confidence score if available
}

/**
 * Complete original transcript with metadata
 */
export interface TranscriptData {
  transcript: OriginalTranscript;
  metadata: TranscriptMetadata;
}

/**
 * Represents a user-added text entry to enhance the transcript
 */
export interface AdditionalTextEntry {
  id: string;
  content: string;
  timestamp?: number; // Optional timestamp where this note relates to (in seconds)
  label: string; // e.g., "Additional Notes", "Context", "Correction", "Clarification"
  createdAt: Date;
  updatedAt: Date;
  position?: 'before' | 'after' | 'inline'; // Where to display relative to transcript
  segmentId?: string; // Optional reference to a specific transcript segment
}

/**
 * Collection of additional text entries for a transcript
 */
export interface AdditionalTextCollection {
  videoId: number;
  entries: AdditionalTextEntry[];
  totalCharacters: number;
  lastModified: Date;
}

/**
 * Enhanced transcript segment that combines original and additional text
 */
export interface EnhancedTranscriptSegment extends TranscriptSegment {
  additionalText?: AdditionalTextEntry[]; // Additional text entries associated with this segment
}

/**
 * Enhanced transcript that combines original transcript with user additions
 */
export interface EnhancedTranscript {
  videoId: number;
  original: OriginalTranscript;
  additionalTextCollection: AdditionalTextCollection;
  enhancedSegments?: EnhancedTranscriptSegment[]; // Segments with integrated additional text
  mergedText?: string; // Full transcript with additional text merged in
  enhancementMetadata: {
    totalEnhancements: number;
    lastEnhancedAt: Date;
    enhancedBy: string; // User ID
    version: number; // Version number for tracking changes
  };
}

/**
 * Options for merging original and additional text
 */
export interface TranscriptMergeOptions {
  includeTimestamps: boolean;
  includeLabels: boolean;
  separateAdditionalText: boolean; // If true, clearly separate additional text sections
  additionalTextPrefix?: string; // e.g., "[Additional Notes]: "
  format: 'plain' | 'markdown' | 'html';
}

/**
 * Result of merging transcript with additional text
 */
export interface MergedTranscriptResult {
  text: string;
  format: 'plain' | 'markdown' | 'html';
  wordCount: number;
  enhancementCount: number;
  segments?: EnhancedTranscriptSegment[];
}

/**
 * Validation schemas for transcript enhancement
 */

// Valid labels for additional text entries
export const ADDITIONAL_TEXT_LABELS = [
  'Additional Notes',
  'Context',
  'Correction',
  'Clarification',
  'Speaker Note',
  'Technical Detail',
  'Reference',
  'Summary'
] as const;

export type AdditionalTextLabel = typeof ADDITIONAL_TEXT_LABELS[number];

// Validation schema for additional text entry input
export const additionalTextEntrySchema = z.object({
  content: z.string()
    .min(1, 'Content cannot be empty'),
  timestamp: z.number()
    .min(0, 'Timestamp must be positive')
    .optional(),
  label: z.enum(ADDITIONAL_TEXT_LABELS),
  position: z.enum(['before', 'after', 'inline']).optional(),
  segmentId: z.string().optional()
});

// Validation schema for creating new additional text
export const createAdditionalTextSchema = additionalTextEntrySchema;

// Validation schema for updating additional text
export const updateAdditionalTextSchema = additionalTextEntrySchema.partial();

// Validation schema for transcript merge options
export const transcriptMergeOptionsSchema = z.object({
  includeTimestamps: z.boolean().default(false),
  includeLabels: z.boolean().default(true),
  separateAdditionalText: z.boolean().default(true),
  additionalTextPrefix: z.string().optional().default('[Additional Notes]: '),
  format: z.enum(['plain', 'markdown', 'html']).default('plain')
});

// Type exports from schemas
export type CreateAdditionalTextInput = z.infer<typeof createAdditionalTextSchema>;
export type UpdateAdditionalTextInput = z.infer<typeof updateAdditionalTextSchema>;
export type ValidatedTranscriptMergeOptions = z.infer<typeof transcriptMergeOptionsSchema>;