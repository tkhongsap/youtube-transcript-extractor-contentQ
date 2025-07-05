import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptEnhancement } from './TranscriptEnhancement';
import type { OriginalTranscript, AdditionalTextCollection, CreateAdditionalTextInput } from '@/types/transcript';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('TranscriptEnhancement', () => {
  const mockOriginalTranscript: OriginalTranscript = {
    videoId: 1,
    rawText: 'This is a sample transcript. It has multiple sentences.',
    source: 'youtube',
    generatedAt: new Date('2023-01-01'),
    segments: [
      {
        id: 'seg-1',
        text: 'This is a sample transcript.',
        startTime: 0,
        endTime: 3,
      },
      {
        id: 'seg-2',
        text: 'It has multiple sentences.',
        startTime: 3,
        endTime: 6,
      },
    ],
  };

  const mockAdditionalTextCollection: AdditionalTextCollection = {
    videoId: 1,
    entries: [
      {
        id: 'entry-1',
        content: 'This is additional context for the first segment.',
        label: 'Context',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        timestamp: 1,
      },
    ],
    totalCharacters: 48,
    lastModified: new Date('2023-01-01'),
  };

  const defaultProps = {
    originalTranscript: mockOriginalTranscript,
    onSaveAdditionalText: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the transcript enhancement interface', () => {
      render(<TranscriptEnhancement {...defaultProps} />);
      
      expect(screen.getByRole('main', { name: /transcript enhancement interface/i })).toBeInTheDocument();
      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });

    it('shows both Original and Enhanced tabs', () => {
      render(<TranscriptEnhancement {...defaultProps} />);
      
      expect(screen.getByRole('tab', { name: /original/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /enhanced/i })).toBeInTheDocument();
    });

    it('shows Add Notes button when not read-only', () => {
      render(<TranscriptEnhancement {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /add notes/i })).toBeInTheDocument();
    });

    it('hides Add Notes button when read-only', () => {
      render(<TranscriptEnhancement {...defaultProps} readOnly={true} />);
      
      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('defaults to Original tab', () => {
      render(<TranscriptEnhancement {...defaultProps} />);
      
      const originalTab = screen.getByRole('tab', { name: /original/i });
      expect(originalTab).toHaveAttribute('data-state', 'active');
    });

    it('switches to Enhanced tab when clicked', async () => {
      const user = userEvent.setup();
      render(<TranscriptEnhancement {...defaultProps} />);
      
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      await user.click(enhancedTab);
      
      expect(enhancedTab).toHaveAttribute('data-state', 'active');
    });

    it('shows enhancement count badge when there are additional entries', () => {
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          additionalTextCollection={mockAdditionalTextCollection}
        />
      );
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Badge showing count
    });
  });

  describe('Original Transcript Display', () => {
    it('displays transcript segments with timestamps', () => {
      render(<TranscriptEnhancement {...defaultProps} />);
      
      expect(screen.getByText('This is a sample transcript.')).toBeInTheDocument();
      expect(screen.getByText('It has multiple sentences.')).toBeInTheDocument();
      expect(screen.getByText('[0:00]')).toBeInTheDocument();
      expect(screen.getByText('[0:03]')).toBeInTheDocument();
    });

    it('handles transcript without segments', () => {
      const transcriptWithoutSegments: OriginalTranscript = {
        ...mockOriginalTranscript,
        segments: undefined,
      };
      
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          originalTranscript={transcriptWithoutSegments}
        />
      );
      
      // Should still render content from rawText
      expect(screen.getByText(/this is a sample transcript/i)).toBeInTheDocument();
    });
  });

  describe('Enhanced View', () => {
    it('shows message when no additional entries exist', async () => {
      const user = userEvent.setup();
      render(<TranscriptEnhancement {...defaultProps} />);
      
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      await user.click(enhancedTab);
      
      expect(screen.getByText(/no additional notes yet/i)).toBeInTheDocument();
    });

    it('displays additional text entries in enhanced view', async () => {
      const user = userEvent.setup();
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          additionalTextCollection={mockAdditionalTextCollection}
        />
      );
      
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      await user.click(enhancedTab);
      
      expect(screen.getByText('This is additional context for the first segment.')).toBeInTheDocument();
      expect(screen.getByText('Context')).toBeInTheDocument();
      expect(screen.getByText('at 0:01')).toBeInTheDocument();
    });

    it('shows edit and delete buttons for additional entries when not read-only', async () => {
      const user = userEvent.setup();
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          additionalTextCollection={mockAdditionalTextCollection}
          onDeleteAdditionalText={vi.fn()}
        />
      );
      
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      await user.click(enhancedTab);
      
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  describe('Add Form Functionality', () => {
    it('toggles add form visibility when Add Notes button is clicked', async () => {
      const user = userEvent.setup();
      render(<TranscriptEnhancement {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: /add notes/i });
      
      // Form should not be visible initially
      expect(screen.queryByRole('region', { name: /add additional text form/i })).not.toBeInTheDocument();
      
      // Click to show form
      await user.click(addButton);
      expect(screen.getByRole('region', { name: /add additional text form/i })).toBeInTheDocument();
      
      // Click again to hide form
      await user.click(addButton);
      expect(screen.queryByRole('region', { name: /add additional text form/i })).not.toBeInTheDocument();
    });

    it('updates button text when form is shown/hidden', async () => {
      const user = userEvent.setup();
      render(<TranscriptEnhancement {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: /add notes/i });
      
      await user.click(addButton);
      expect(addButton).toHaveTextContent('Hide Notes');
      
      await user.click(addButton);
      expect(addButton).toHaveTextContent('Add Notes');
    });

    it('calls onSaveAdditionalText when save is triggered', async () => {
      const user = userEvent.setup();
      const mockSave = vi.fn().mockResolvedValue(undefined);
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          onSaveAdditionalText={mockSave}
        />
      );
      
      // Show form
      const addButton = screen.getByRole('button', { name: /add notes/i });
      await user.click(addButton);
      
      // Fill in form
      const textarea = screen.getByLabelText(/additional text content/i);
      await user.type(textarea, 'Test additional text');
      
      // Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(mockSave).toHaveBeenCalledWith({
        content: 'Test additional text',
        label: 'Additional Notes',
        timestamp: undefined,
      });
    });
  });

  describe('Delete Functionality', () => {
    it('calls onDeleteAdditionalText when delete button is clicked', async () => {
      const user = userEvent.setup();
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          additionalTextCollection={mockAdditionalTextCollection}
          onDeleteAdditionalText={mockDelete}
        />
      );
      
      // Switch to enhanced view
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      await user.click(enhancedTab);
      
      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      
      expect(mockDelete).toHaveBeenCalledWith('entry-1');
    });
  });

  describe('Read-Only Mode', () => {
    it('hides form and action buttons in read-only mode', async () => {
      const user = userEvent.setup();
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          additionalTextCollection={mockAdditionalTextCollection}
          readOnly={true}
        />
      );
      
      // Switch to enhanced view
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      await user.click(enhancedTab);
      
      // Should not show action buttons
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add notes/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA landmarks and labels', () => {
      render(<TranscriptEnhancement {...defaultProps} />);
      
      expect(screen.getByRole('main', { name: /transcript enhancement interface/i })).toBeInTheDocument();
      expect(screen.getByRole('article', { name: /original video transcript/i })).toBeInTheDocument();
    });

    it('has keyboard accessible transcript segments', () => {
      render(<TranscriptEnhancement {...defaultProps} />);
      
      const segments = screen.getAllByRole('region');
      const transcriptSegments = segments.filter(segment => 
        segment.getAttribute('aria-label')?.includes('Transcript segment')
      );
      
      transcriptSegments.forEach(segment => {
        expect(segment).toHaveAttribute('tabIndex', '0');
      });
    });

    it('provides descriptive button labels', async () => {
      const user = userEvent.setup();
      render(<TranscriptEnhancement {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: /add notes/i });
      expect(addButton).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(addButton);
      expect(addButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles save errors gracefully', async () => {
      const user = userEvent.setup();
      const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          onSaveAdditionalText={mockSave}
        />
      );
      
      // Show form and try to save
      const addButton = screen.getByRole('button', { name: /add notes/i });
      await user.click(addButton);
      
      const textarea = screen.getByLabelText(/additional text content/i);
      await user.type(textarea, 'Test content');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should handle error without crashing
      expect(mockSave).toHaveBeenCalled();
    });

    it('handles delete errors gracefully', async () => {
      const user = userEvent.setup();
      const mockDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
      render(
        <TranscriptEnhancement 
          {...defaultProps} 
          additionalTextCollection={mockAdditionalTextCollection}
          onDeleteAdditionalText={mockDelete}
        />
      );
      
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      await user.click(enhancedTab);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      
      // Should handle error without crashing
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});