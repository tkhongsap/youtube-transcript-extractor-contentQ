import { storage } from './storage';
import type { AdditionalText } from '@shared/schema';

export interface EnhancedTranscriptOptions {
  includeTimestamps?: boolean;
  includeLabels?: boolean;
  separateAdditionalText?: boolean;
  format?: 'plain' | 'markdown';
}

export interface EnhancedTranscriptResult {
  originalTranscript: string;
  enhancedTranscript: string;
  additionalTextEntries: AdditionalText[];
  enhancementCount: number;
  hasEnhancements: boolean;
}

/**
 * Retrieves and merges original transcript with additional text entries
 */
export async function getEnhancedTranscript(
  videoId: number,
  options: EnhancedTranscriptOptions = {}
): Promise<EnhancedTranscriptResult | null> {
  const {
    includeTimestamps = true,
    includeLabels = true,
    separateAdditionalText = true,
    format = 'plain'
  } = options;

  // Get video and additional text entries
  const video = await storage.getVideo(videoId);
  if (!video) {
    return null;
  }

  const additionalTextEntries = await storage.getAdditionalTextByVideoId(videoId);
  const originalTranscript = video.transcript || '';
  
  // If no additional text and no original transcript, return null
  if (additionalTextEntries.length === 0 && !originalTranscript) {
    return null;
  }
  
  // If no additional text but has original transcript, return original
  if (additionalTextEntries.length === 0) {
    return {
      originalTranscript,
      enhancedTranscript: originalTranscript,
      additionalTextEntries: [],
      enhancementCount: 0,
      hasEnhancements: false,
    };
  }

  // Create enhanced transcript (even if original is empty)
  let enhancedTranscript = originalTranscript;

  if (separateAdditionalText) {
    // Add additional text as separate sections
    const timestampedEntries = additionalTextEntries
      .filter(entry => entry.timestamp !== undefined)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const nonTimestampedEntries = additionalTextEntries.filter(entry => entry.timestamp === undefined);

    if (timestampedEntries.length > 0) {
      enhancedTranscript += '\n\n--- Additional Context & Insights ---\n';
      
      for (const entry of timestampedEntries) {
        let entryText = '';
        
        if (includeTimestamps && entry.timestamp) {
          const minutes = Math.floor(entry.timestamp / 60);
          const seconds = entry.timestamp % 60;
          entryText += `(${minutes}:${seconds.toString().padStart(2, '0')}) `;
        }
        
        if (includeLabels) {
          entryText += `[${entry.label}] `;
        }
        
        entryText += entry.content;
        
        if (format === 'markdown') {
          enhancedTranscript += `\n**${entryText}**\n`;
        } else {
          enhancedTranscript += `\n${entryText}\n`;
        }
      }
    }

    if (nonTimestampedEntries.length > 0) {
      enhancedTranscript += '\n\n--- General Notes & Corrections ---\n';
      
      for (const entry of nonTimestampedEntries) {
        let entryText = '';
        
        if (includeLabels) {
          entryText += `[${entry.label}] `;
        }
        
        entryText += entry.content;
        
        if (format === 'markdown') {
          enhancedTranscript += `\n**${entryText}**\n`;
        } else {
          enhancedTranscript += `\n${entryText}\n`;
        }
      }
    }
  } else {
    // Inline integration (basic implementation)
    enhancedTranscript += '\n\n--- Enhanced Content ---\n';
    for (const entry of additionalTextEntries) {
      enhancedTranscript += `\n[${entry.label}] ${entry.content}`;
    }
  }

  return {
    originalTranscript,
    enhancedTranscript,
    additionalTextEntries,
    enhancementCount: additionalTextEntries.length,
    hasEnhancements: true,
  };
}

/**
 * Checks if enhanced transcripts should be used based on user preferences or video settings
 */
export async function shouldUseEnhancedTranscript(
  videoId: number,
  userPreference?: 'original' | 'enhanced' | 'auto'
): Promise<boolean> {
  const preference = userPreference || 'auto';
  
  if (preference === 'original') {
    return false;
  }
  
  if (preference === 'enhanced') {
    return true;
  }
  
  // Auto mode: use enhanced if significant additional content exists
  const additionalTextEntries = await storage.getAdditionalTextByVideoId(videoId);
  const totalAdditionalChars = additionalTextEntries.reduce((sum, entry) => sum + entry.content.length, 0);
  
  // Use enhanced if there are at least 100 characters of additional content
  return totalAdditionalChars >= 100;
}

/**
 * Gets the appropriate transcript (original or enhanced) based on preferences
 */
export async function getTranscriptForAI(
  videoId: number,
  userPreference?: 'original' | 'enhanced' | 'auto'
): Promise<{ transcript: string; isEnhanced: boolean }> {
  const useEnhanced = await shouldUseEnhancedTranscript(videoId, userPreference);
  console.log(`[getTranscriptForAI] Video ${videoId}: useEnhanced=${useEnhanced}, preference=${userPreference}`);
  
  if (useEnhanced) {
    const enhancedResult = await getEnhancedTranscript(videoId);
    console.log(`[getTranscriptForAI] Enhanced result: ${enhancedResult ? `has ${enhancedResult.enhancementCount} enhancements, transcript length=${enhancedResult.enhancedTranscript.length}` : 'null'}`);
    if (enhancedResult && enhancedResult.hasEnhancements) {
      return {
        transcript: enhancedResult.enhancedTranscript,
        isEnhanced: true,
      };
    }
  }
  
  // Fallback to original transcript
  const video = await storage.getVideo(videoId);
  console.log(`[getTranscriptForAI] Falling back to original transcript, length=${video?.transcript?.length || 0}`);
  return {
    transcript: video?.transcript || '',
    isEnhanced: false,
  };
}

/**
 * Configuration for AI processing with enhanced transcripts
 */
export interface AIProcessingConfig {
  transcriptPreference?: 'original' | 'enhanced' | 'auto';
  includeProfessionalContext?: boolean;
  emphasizeAdditionalInsights?: boolean;
  enhanceCreativeOutput?: boolean;
}

export const DEFAULT_AI_CONFIG: AIProcessingConfig = {
  transcriptPreference: 'auto',
  includeProfessionalContext: true,
  emphasizeAdditionalInsights: true,
  enhanceCreativeOutput: false,
};