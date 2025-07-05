/**
 * Integration tests for the complete transcript enhancement workflow
 * Tests the full flow from UI interaction to API calls and state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TranscriptEnhancement } from '@/components/TranscriptEnhancement';
import { TranscriptService } from '@/lib/transcriptService';
import type { 
  OriginalTranscript, 
  AdditionalTextCollection,
  AdditionalTextEntry,
  EnhancedTranscript 
} from '@/types/transcript';

// Mock the TranscriptService
vi.mock('@/lib/transcriptService');
const mockedTranscriptService = vi.mocked(TranscriptService);

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Transcript Enhancement Integration Tests', () => {
  let queryClient: QueryClient;
  
  const mockOriginalTranscript: OriginalTranscript = {
    videoId: 1,
    rawText: 'This is the original transcript content for integration testing.',
    source: 'youtube',
    generatedAt: new Date(),
  };

  const mockAdditionalTextCollection: AdditionalTextCollection = {
    videoId: 1,
    entries: [
      {
        id: 'entry-1',
        content: 'Important context for the video.',
        label: 'Context',
        timestamp: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'entry-2',
        content: 'Correction to the original transcript.',
        label: 'Correction',
        timestamp: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    totalCharacters: 75,
    lastModified: new Date(),
  };

  const mockEnhancedTranscript: EnhancedTranscript = {
    originalTranscript: mockOriginalTranscript,
    additionalTextCollection: mockAdditionalTextCollection,
    mergedText: `${mockOriginalTranscript.rawText}\n\n--- Additional Context & Insights ---\n[Context] (0:30) Important context for the video.\n[Correction] (1:00) Correction to the original transcript.`,
    enhancementCount: 2,
    wordCount: 25,
    format: 'plain',
    generatedAt: new Date(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Complete Enhancement Workflow', () => {
    it('should handle the full enhancement workflow from UI to API', async () => {
      // Setup: Mock service methods
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      mockedTranscriptService.getEnhancedTranscript.mockResolvedValue(mockEnhancedTranscript);
      mockedTranscriptService.saveAdditionalText.mockResolvedValue({
        id: 'new-entry',
        content: 'New additional text from UI',
        label: 'Context',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Render component
      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Original')).toBeInTheDocument();
        expect(screen.getByText('Enhanced')).toBeInTheDocument();
      });

      // Verify original transcript is displayed
      expect(screen.getByText(mockOriginalTranscript.rawText)).toBeInTheDocument();

      // Switch to enhanced view
      const enhancedTab = screen.getByText('Enhanced');
      fireEvent.click(enhancedTab);

      await waitFor(() => {
        expect(screen.getByText('Important context for the video.')).toBeInTheDocument();
        expect(screen.getByText('Correction to the original transcript.')).toBeInTheDocument();
      });

      // Add new additional text
      const addButton = screen.getByText('Add Additional Text');
      fireEvent.click(addButton);

      // Fill in the form
      const textarea = screen.getByPlaceholderText(/Enter additional text/);
      const labelSelect = screen.getByDisplayValue('Context');
      const timestampInput = screen.getByPlaceholderText('90');

      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'New additional text from UI' } });
        fireEvent.change(labelSelect, { target: { value: 'Insight' } });
        fireEvent.change(timestampInput, { target: { value: '90' } });
      });

      // Save the additional text
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Verify service was called
      await waitFor(() => {
        expect(mockedTranscriptService.saveAdditionalText).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            content: 'New additional text from UI',
            label: 'Insight',
            timestamp: 90,
          })
        );
      });

      // Verify UI updates
      expect(screen.getByText('New additional text from UI')).toBeInTheDocument();
    });

    it('should handle auto-save functionality', async () => {
      // Setup: Mock service with auto-save
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue({
        videoId: 1,
        entries: [],
        totalCharacters: 0,
        lastModified: new Date(),
      });

      let autoSaveResolver: (value: AdditionalTextEntry) => void;
      const autoSavePromise = new Promise<AdditionalTextEntry>((resolve) => {
        autoSaveResolver = resolve;
      });
      mockedTranscriptService.saveAdditionalText.mockReturnValue(autoSavePromise);

      // Render component with auto-save enabled
      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
          enableAutoSave={true}
          autoSaveDelay={1000}
        />
      );

      // Add text that triggers auto-save
      const addButton = screen.getByText('Add Additional Text');
      fireEvent.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter additional text/);
      
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Auto-save test content' } });
      });

      // Wait for auto-save delay and verify unsaved changes indicator
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });

      // Simulate auto-save completion
      await act(async () => {
        autoSaveResolver!({
          id: 'auto-saved',
          content: 'Auto-save test content',
          label: 'Context',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // Verify auto-save completed
      await waitFor(() => {
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Enhanced AI Processing Integration', () => {
    it('should trigger enhanced AI processing when enhanced transcript is available', async () => {
      // Setup: Mock enhanced transcript with substantial content
      const substantialAdditionalText: AdditionalTextCollection = {
        videoId: 1,
        entries: [
          {
            id: 'substantial-1',
            content: 'This is a substantial amount of additional context that provides significant business value and professional insights that warrant enhanced AI processing.',
            label: 'Context',
            timestamp: 30,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalCharacters: 150,
        lastModified: new Date(),
      };

      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(substantialAdditionalText);
      mockedTranscriptService.getEnhancedTranscript.mockResolvedValue({
        ...mockEnhancedTranscript,
        additionalTextCollection: substantialAdditionalText,
      });

      // Mock fetch for enhanced AI API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            summary: 'Enhanced summary with additional context',
            keyTopics: ['Original Content', 'Additional Context'],
          },
          meta: {
            usedEnhancedTranscript: true,
            transcriptPreference: 'auto',
          },
        }),
      });

      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
          enableAIProcessing={true}
        />
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced')).toBeInTheDocument();
      });

      // Trigger AI processing (simulate button click or auto-trigger)
      const generateButton = screen.getByText(/Generate Enhanced Summary/i);
      fireEvent.click(generateButton);

      // Verify enhanced AI endpoint was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/1/generate-enhanced-summary',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('transcriptPreference'),
          })
        );
      });

      // Verify UI shows enhanced processing result
      await waitFor(() => {
        expect(screen.getByText('Enhanced summary with additional context')).toBeInTheDocument();
        expect(screen.getByText(/Used Enhanced Transcript/i)).toBeInTheDocument();
      });
    });

    it('should handle AI processing configuration options', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);

      // Mock AI configuration API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { title: 'Enhanced Medium Article', content: 'Article content...' },
          meta: { usedEnhancedTranscript: true, transcriptPreference: 'enhanced' },
        }),
      });

      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
        />
      );

      // Open AI configuration panel
      const configButton = screen.getByText(/AI Settings/i);
      fireEvent.click(configButton);

      // Configure AI options
      const enhancedOption = screen.getByLabelText(/Use Enhanced Transcript/i);
      const professionalContext = screen.getByLabelText(/Include Professional Context/i);
      const emphasizeInsights = screen.getByLabelText(/Emphasize Additional Insights/i);

      fireEvent.click(enhancedOption);
      fireEvent.click(professionalContext);
      fireEvent.click(emphasizeInsights);

      // Generate enhanced report
      const generateReport = screen.getByText(/Generate Enhanced Report/i);
      fireEvent.click(generateReport);

      // Select Medium report type
      const mediumOption = screen.getByText('Medium Article');
      fireEvent.click(mediumOption);

      // Verify API call with correct configuration
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/videos/1/generate-enhanced-report?type=medium',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringMatching(/"transcriptPreference":"enhanced"/),
          })
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API failures gracefully', async () => {
      // Setup: Mock service to fail
      mockedTranscriptService.getAdditionalTextCollection.mockRejectedValue(
        new Error('Network error')
      );

      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
        />
      );

      // Verify error state is displayed
      await waitFor(() => {
        expect(screen.getByText(/Error loading additional text/i)).toBeInTheDocument();
      });

      // Verify retry functionality
      const retryButton = screen.getByText(/Retry/i);
      
      // Setup successful retry
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);
      
      fireEvent.click(retryButton);

      // Verify successful retry
      await waitFor(() => {
        expect(screen.queryByText(/Error loading additional text/i)).not.toBeInTheDocument();
        expect(screen.getByText('Enhanced')).toBeInTheDocument();
      });
    });

    it('should handle empty additional text collections', async () => {
      // Setup: Empty collection
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue({
        videoId: 1,
        entries: [],
        totalCharacters: 0,
        lastModified: new Date(),
      });

      mockedTranscriptService.getEnhancedTranscript.mockResolvedValue({
        originalTranscript: mockOriginalTranscript,
        additionalTextCollection: { videoId: 1, entries: [], totalCharacters: 0, lastModified: new Date() },
        mergedText: mockOriginalTranscript.rawText,
        enhancementCount: 0,
        wordCount: 10,
        format: 'plain',
        generatedAt: new Date(),
      });

      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
        />
      );

      // Verify enhanced tab shows empty state
      const enhancedTab = screen.getByText('Enhanced');
      fireEvent.click(enhancedTab);

      await waitFor(() => {
        expect(screen.getByText(/No additional text added yet/i)).toBeInTheDocument();
        expect(screen.getByText(/Add some context/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue({
        videoId: 1,
        entries: [],
        totalCharacters: 0,
        lastModified: new Date(),
      });

      // Mock validation error
      mockedTranscriptService.saveAdditionalText.mockRejectedValue({
        message: 'Content cannot be empty',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
        />
      );

      // Try to save empty content
      const addButton = screen.getByText('Add Additional Text');
      fireEvent.click(addButton);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText('Content cannot be empty')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should handle large amounts of additional text efficiently', async () => {
      // Setup: Large collection of additional text
      const largeCollection: AdditionalTextCollection = {
        videoId: 1,
        entries: Array.from({ length: 50 }, (_, i) => ({
          id: `entry-${i}`,
          content: `Additional text entry number ${i} with sufficient content to test performance.`,
          label: 'Context' as const,
          timestamp: i * 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        totalCharacters: 4000,
        lastModified: new Date(),
      };

      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(largeCollection);

      const startTime = performance.now();
      
      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Enhanced')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      // Verify reasonable render time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);

      // Verify all entries are rendered (virtualization might limit visible ones)
      const enhancedTab = screen.getByText('Enhanced');
      fireEvent.click(enhancedTab);

      await waitFor(() => {
        expect(screen.getByText('Additional text entry number 0')).toBeInTheDocument();
      });
    });

    it('should meet accessibility requirements', async () => {
      mockedTranscriptService.getAdditionalTextCollection.mockResolvedValue(mockAdditionalTextCollection);

      renderWithQueryClient(
        <TranscriptEnhancement 
          originalTranscript={mockOriginalTranscript}
          videoId={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Enhanced')).toBeInTheDocument();
      });

      // Verify ARIA labels and roles
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Original/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Enhanced/i })).toBeInTheDocument();

      // Verify keyboard navigation
      const originalTab = screen.getByRole('tab', { name: /Original/i });
      const enhancedTab = screen.getByRole('tab', { name: /Enhanced/i });

      // Test tab navigation
      originalTab.focus();
      fireEvent.keyDown(originalTab, { key: 'ArrowRight' });
      expect(enhancedTab).toHaveFocus();

      fireEvent.keyDown(enhancedTab, { key: 'ArrowLeft' });
      expect(originalTab).toHaveFocus();

      // Test space/enter activation
      fireEvent.keyDown(enhancedTab, { key: 'Enter' });
      expect(enhancedTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});